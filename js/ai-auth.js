/*
 * Pantry: sign-in for the built-in AI feature.
 * Separate from the Drive sign-in in auth.js. The Google ID token is kept
 * in memory only, never in browser storage.
 */

import { getConfig, hasValidConfig } from "./auth.js";
import { getLanguage } from "./i18n.js";

const GIS_WAIT_MS = 12000;
const EXPIRY_MARGIN_MS = 60000;

let idToken = null;
let expiresAt = 0;
let initPromise = null;
const listeners = [];

export function hasAiSession() {
  return Boolean(idToken) && Date.now() < expiresAt - EXPIRY_MARGIN_MS;
}

/** The ID token for the Worker, or null when it is missing or about to expire. */
export function getAiIdToken() {
  return hasAiSession() ? idToken : null;
}

/** Call fn(signedIn) whenever the AI sign-in changes. */
export function onAiSessionChange(fn) {
  listeners.push(fn);
}

function notify() {
  listeners.forEach((fn) => fn(hasAiSession()));
}

function readExpiry(jwt) {
  let payload = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  payload += "=".repeat((4 - (payload.length % 4)) % 4);
  return JSON.parse(atob(payload)).exp * 1000;
}

function handleCredential(response) {
  if (!response?.credential) return;
  idToken = response.credential;
  expiresAt = readExpiry(idToken);
  notify();
}

function waitForGis() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      if (Date.now() - started > GIS_WAIT_MS) {
        reject(new Error("Google sign-in did not load."));
        return;
      }
      window.setTimeout(check, 120);
    };
    check();
  });
}

/**
 * Draw Google's sign-in button inside `container`.
 * Resolves false when the Client ID is missing.
 */
export async function renderAiSignIn(container) {
  if (!hasValidConfig()) return false;

  if (!initPromise) {
    initPromise = waitForGis().then(() => {
      window.google.accounts.id.initialize({
        client_id: getConfig().googleClientId,
        callback: handleCredential,
        auto_select: false
      });
    });
  }
  await initPromise;

  window.google.accounts.id.renderButton(container, {
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "pill",
    width: 280,
    locale: getLanguage()
  });
  return true;
}