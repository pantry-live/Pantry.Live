/*
 * Pantry — Google Identity Services authentication.
 *
 * This is a static app, so we use the OAuth 2.0 token flow in the browser.
 * There is no refresh token and no backend. Tokens normally last about an
 * hour; the app asks the user to sign in again when a token expires.
 *
 * Scopes:
 *   openid profile  -> only to read the account name and locale
 *   drive.file      -> create/read/update only files this app created
 */

const SCOPES = "openid profile https://www.googleapis.com/auth/drive.file";
const SESSION_KEY = "pantry.session.v1";

class AuthError extends Error {
  constructor(message, code = "auth_error") {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

let tokenClient = null;
let accessToken = null;
let expiresAt = 0;
let profile = null;
let initializing = null;
let signInPromise = null;
let pendingResolve = null;
let pendingReject = null;

export function getConfig() {
  const config = window.PANTRY_CONFIG || {};
  return {
    googleClientId: String(config.googleClientId || "").trim(),
    driveFolderName: String(config.driveFolderName || "Pantry App").trim() || "Pantry App",
    driveFileName: String(config.driveFileName || "pantry-data.json").trim() || "pantry-data.json"
  };
}

export function hasValidConfig() {
  const clientId = getConfig().googleClientId;
  return Boolean(clientId) && !/YOUR_GOOGLE_CLIENT_ID/i.test(clientId);
}

function waitForGoogle(timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    const check = () => {
      if (window.google?.accounts?.oauth2?.initTokenClient) {
        resolve();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new AuthError("Google Identity Services did not load.", "gis_unavailable"));
        return;
      }
      window.setTimeout(check, 120);
    };

    check();
  });
}

function rejectPending(error) {
  if (pendingReject) pendingReject(error);
  pendingResolve = null;
  pendingReject = null;
}

function resolvePending(value) {
  if (pendingResolve) pendingResolve(value);
  pendingResolve = null;
  pendingReject = null;
}

function setSession(token, expiresIn) {
  const lifetime = Math.max(60, Number(expiresIn) || 3600) * 1000;
  const safetyWindow = Math.min(60_000, Math.floor(lifetime * 0.1));
  accessToken = token;
  expiresAt = Date.now() + lifetime - safetyWindow;
}

function saveSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      accessToken,
      expiresAt,
      profile
    }));
  } catch {
    /* Private mode or storage disabled: the in-memory session still works. */
  }
}

function restoreSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved?.accessToken && Number(saved.expiresAt) > Date.now() + 30_000) {
      accessToken = saved.accessToken;
      expiresAt = Number(saved.expiresAt);
      profile = saved.profile || null;
    }
  } catch {
    /* Ignore corrupt or unavailable storage. */
  }
}

async function fetchProfile(token) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Profile request failed (${response.status})`);
  const data = await response.json();
  return {
    sub: String(data.sub || ""),
    name: String(data.name || data.given_name || ""),
    locale: String(data.locale || navigator.language || "en")
  };
}

function fallbackProfile() {
  return {
    sub: "",
    name: "",
    locale: navigator.language || "en"
  };
}

async function completeSignIn(response) {
  if (!response?.access_token) {
    rejectPending(new AuthError("No access token returned.", "auth_error"));
    return;
  }

  setSession(response.access_token, response.expires_in);

  try {
    profile = await fetchProfile(response.access_token);
  } catch {
    profile = fallbackProfile();
  }

  saveSession();
  resolvePending({ accessToken, expiresAt, profile });
}

/**
 * Initialise the GIS token client. Safe to call more than once.
 * Resolves false when config is missing.
 */
export async function init() {
  if (tokenClient) return true;
  if (initializing) return initializing;

  initializing = (async () => {
    if (!hasValidConfig()) return false;

    await waitForGoogle();

    if (!window.google?.accounts?.oauth2?.initTokenClient) {
      throw new AuthError("Google Identity Services is unavailable.", "gis_unavailable");
    }

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: getConfig().googleClientId,
      scope: SCOPES,
      callback: (response) => {
        if (response?.error) {
          const code = response.error === "access_denied"
            ? "auth_denied"
            : response.error === "popup_closed"
              ? "popup_closed"
              : "auth_error";
          rejectPending(new AuthError(
            response.error_description || response.error,
            code
          ));
          return;
        }
        completeSignIn(response);
      },
      error_callback: (error) => {
        const code = error?.type === "popup_closed" ? "popup_closed" : "auth_error";
        rejectPending(new AuthError(error?.message || error?.type || "Sign-in failed.", code));
      }
    });

    restoreSession();
    return true;
  })();

  try {
    return await initializing;
  } catch (error) {
    initializing = null;
    throw error;
  }
}

/** Request an access token. Must be called from a user gesture. */
export async function signIn() {
  if (signInPromise) return signInPromise;

  const ready = await init();
  if (!ready) {
    throw new AuthError("Google Client ID is not configured.", "config_missing");
  }

  signInPromise = new Promise((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;

    try {
      // An empty prompt avoids asking for the same consent twice.
      tokenClient.requestAccessToken({ prompt: "" });
    } catch (error) {
      rejectPending(new AuthError(error?.message || "Sign-in failed.", "auth_error"));
    }
  }).finally(() => {
    signInPromise = null;
  });

  return signInPromise;
}

/**
 * Restore a saved token synchronously, before Google Identity Services loads.
 * This lets the splash screen honour an existing session without a login.
 */
export function restoreExistingSession() {
  if (!accessToken) restoreSession();
  return getSession();
}

function getSession() {
  if (!accessToken || !expiresAt || Date.now() >= expiresAt) return null;
  return { accessToken, expiresAt, profile };
}

export function hasSession() {
  return Boolean(getSession());
}

export function getAccessToken() {
  return getSession()?.accessToken || null;
}

export function getProfile() {
  return profile;
}

export function getLocale() {
  return profile?.locale || navigator.language || "en";
}

export function expireSession() {
  accessToken = null;
  expiresAt = 0;
  profile = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* Ignore. */
  }
}

/** Revoke the token when possible and always clear the local session. */
export async function signOut() {
  const token = accessToken;
  expireSession();

  if (!token || !window.google?.accounts?.oauth2?.revoke) return;

  await new Promise((resolve) => {
    try {
      window.google.accounts.oauth2.revoke(token, () => resolve());
    } catch {
      resolve();
    }
  });
}
