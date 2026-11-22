/*
 * Pantry — bootstrap, authentication gate, navigation, and shared chrome.
 */

import * as auth from "./auth.js";
import * as drive from "./drive.js";
import * as store from "./store.js";
import * as cookingView from "./views/cooking.js";
import * as shoppingView from "./views/shopping.js";
import * as brainstormView from "./views/brainstorm.js";
import * as settingsView from "./views/settings.js";
import { runOnboarding, showTutorial } from "./onboarding.js";
import { detectLanguage, setLanguage, t } from "./i18n.js";
import { escapeHtml, icon, openModal, confirmDialog, toast } from "./ui.js";
import { releaseWakeLock } from "./wakelock.js";
import { openManual } from "./manual.js";

localStorage.removeItem("pantry_gemini_api_key");

const VIEWS = {
  cooking: cookingView,
  shopping: shoppingView,
  brainstorm: brainstormView
};

const elements = {
  splash: document.getElementById("splash"),
  splashButton: document.getElementById("splash-button"),
  splashHint: document.getElementById("splash-hint"),
  splashWarning: document.getElementById("splash-warning"),
  splashPrivacyTitle: document.getElementById("splash-privacy-title"),
  app: document.getElementById("app"),
  view: document.getElementById("view"),
  headerBack: document.getElementById("header-back"),
  homeButton: document.getElementById("header-home"),
  settingsButton: document.getElementById("open-settings"),
  tabbar: document.querySelector(".tabbar"),
  tabButtons: [...document.querySelectorAll("[data-tab]")]
};

let currentTab = "cooking";
let currentScreen = "tab";
let activeCleanup = null;
let backHandler = null;
let busy = false;
let reauthOpen = false;
let offlineNotified = false;
let signingOut = false;

const ctx = {
  navigate(tab) {
    showTab(tab);
  },
  openSettings,
  closeSettings() {
    showTab(currentTab);
  },
  setBack(handler) {
    setBackHandler(handler);
  },
  rerender() {
    mountCurrent();
  },
  updateChrome() {
    applyChrome();
  },
  showTutorial,
  signOut: performSignOut
};

/* ------------------------------ Splash ---------------------------------- */

function setSplashHint(text) {
  if (elements.splashHint && text) elements.splashHint.textContent = text;
}

function setSplashWarning(message) {
  if (!elements.splashWarning) return;
  elements.splashWarning.textContent = message || "";
  elements.splashWarning.hidden = !message;
}

function setSplashDisabled(disabled) {
  if (elements.splashButton) elements.splashButton.disabled = disabled;
}

function applySplashLabels() {
  if (elements.splashPrivacyTitle) {
    elements.splashPrivacyTitle.textContent = t("splash.privacyTitle");
  }
  elements.splashButton?.setAttribute("aria-label", t("splash.tapToStart"));
}

function resetSplashHint() {
  setSplashHint(auth.hasSession() ? t("splash.tapToContinue") : t("splash.tapToStart"));
}

/** Load Google Identity Services in the background. Guest mode never waits for it. */
async function prepareAuth() {
  try {
    await auth.init();
  } catch {
    /* Sign-in reports its own error from Settings. */
  }
}

function splashErrorMessage(error) {
  switch (error?.code) {
    case "auth_denied":
    case "popup_closed":
      return t("errors.authDenied");
    case "config_missing":
      return t("splash.configMissing");
    case "gis_unavailable":
      return t("splash.gisUnavailable");
    default:
      return t("errors.authFailed");
  }
}

async function handleSplashClick() {
  if (busy) return;

  busy = true;
  setSplashDisabled(true);
  setSplashWarning("");

  try {
    const session = auth.restoreExistingSession();
    if (!(await openApp(session?.profile || null))) return;
  } catch (error) {
    console.error(error);
    setSplashWarning(splashErrorMessage(error));
    resetSplashHint();
  } finally {
    busy = false;
    if (elements.splash && !elements.splash.hidden) {
      setSplashDisabled(false);
    }
  }
}

/* ----------------------------- App entry -------------------------------- */

async function openApp(profile) {
  setSplashHint(t("splash.loadingRecipes"));
  setSplashDisabled(true);

  const detectedLocale = profile?.locale || auth.getLocale();
  const detectedLanguage = detectLanguage(detectedLocale);

  try {
    if (profile) drive.resetCache();
    await store.init({ profile, detectedLanguage });
  } catch (error) {
    console.error(error);

    if (error?.code === "auth_expired") auth.expireSession();

    elements.app.hidden = true;
    elements.splash.hidden = false;

    const message = error?.code === "auth_expired"
      ? t("errors.sessionExpired")
      : error?.code === "invalid_json"
        ? t("errors.storageCorrupt")
        : profile
          ? t("errors.driveLoad")
          : t("errors.unknownError");

    setSplashWarning(message);
    setSplashHint(t("splash.retry"));
    return false;
  }

  elements.splash.hidden = true;
  elements.app.hidden = false;
  elements.view.innerHTML = "";
  applyChrome();
  showTab("cooking");

  try {
    await runOnboarding({
      detectedLanguage,
      detectedLocale,
      onNavigate(tab) {
        showTab(tab);
      },
      onLanguageChanged() {
        applyChrome();
        mountCurrent();
      }
    });
  } catch (error) {
    console.error(error);
  }

  return true;
}

/* ----------------------------- Navigation ------------------------------- */

function setBackHandler(handler) {
  backHandler = handler;
  if (elements.headerBack) elements.headerBack.hidden = !handler;
}

function updateActiveTab() {
  for (const button of elements.tabButtons) {
    const active = button.dataset.tab === currentTab;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
}

function showTab(tab) {
  if (!VIEWS[tab]) return;

  currentTab = tab;
  currentScreen = "tab";
  mountCurrent();
  updateActiveTab();
  applyChrome();
}

function openSettings() {
  if (!store.getData()) return;

  currentScreen = "settings";
  mountCurrent();
  updateActiveTab();
  applyChrome();
}

function mountCurrent() {
  if (!elements.view) return;

  if (activeCleanup) {
    try {
      activeCleanup();
    } catch (error) {
      console.error(error);
    }
    activeCleanup = null;
  }

  setBackHandler(null);
  elements.view.innerHTML = "";

  const content = document.createElement("div");
  content.className = "page";
  elements.view.append(content);

  const module = currentScreen === "settings"
  ? settingsView
  : VIEWS[currentTab];

  try {
    activeCleanup = module.render(content, ctx) || null;
  } catch (error) {
    console.error(error);
    content.innerHTML = `
      <div class="error-card">
        <div class="error-card__title">${escapeHtml(t("common.error"))}</div>
        <p class="error-card__text">${escapeHtml(t("errors.unknownError"))}</p>
      </div>
    `;
  }

  updateOfflineBanner();
}

function applyChrome() {
  document.querySelectorAll("[data-nav-label]").forEach((element) => {
    element.textContent = t(`nav.${element.dataset.navLabel}`);
  });

  elements.tabbar?.setAttribute("aria-label", t("nav.main"));
  elements.settingsButton?.setAttribute("aria-label", t("nav.settings"));
  elements.headerBack?.setAttribute("aria-label", t("common.back"));
  applySplashLabels();

  if (elements.app?.hidden) {
    document.title = "Pantry";
  } else {
      const label = currentScreen === "settings"
      ? t("nav.settings")
      : t(`nav.${currentTab}`);
    document.title = `${label} · Pantry`;
  }
}

/* ------------------------------ Offline --------------------------------- */

function updateOfflineBanner() {
  if (!elements.view) return;

  const banner = elements.view.querySelector(".offline-banner");
  const offline = store.isOffline();

  if (!offline) {
    banner?.remove();
    offlineNotified = false;
    return;
  }

  if (banner) {
    const label = banner.querySelector("span");
    if (label) label.textContent = t("common.offline");
    return;
  }

  const element = document.createElement("div");
  element.className = "offline-banner";
  element.innerHTML = `${icon("refresh")}<span>${escapeHtml(t("common.offline"))}</span>`;
  elements.view.prepend(element);
}

function handleStoreEvent(event) {
  if (!event) return;

  if (event.type === "saved") {
    updateOfflineBanner();
    return;
  }

  if (event.type === "save-error") {
    updateOfflineBanner();

    if (store.getMode() === "guest") {
      if (!offlineNotified) {
        offlineNotified = true;
        toast(t("errors.localSave"), "error");
      }
      return;
    }

    if (!offlineNotified) {
      offlineNotified = true;
      toast(t("common.savedLocally"), "error");
    }

    if (event.error?.code === "auth_expired") handleSessionExpired();
    return;
  }

  if (event.type === "auth-expired") {
    handleSessionExpired();
    return;
  }

  if (event.type === "language") {
    applyChrome();
    updateOfflineBanner();
  }
}

function handleSessionExpired() {
  if (reauthOpen || signingOut) return;
  reauthOpen = true;

  openModal({
    title: t("common.sessionExpired"),
    body: `<p>${escapeHtml(t("errors.sessionExpired"))}</p>`,
    onClose() {
      reauthOpen = false;
    },
    actions: [
      {
        label: t("common.cancel"),
        variant: "secondary"
      },
      {
        label: t("common.reauthenticate"),
        onClick: async () => {
          try {
            auth.expireSession();
            await auth.signIn();
            store.retrySave();
            return true;
          } catch (error) {
            toast(splashErrorMessage(error), "error");
            return false;
          }
        }
      }
    ]
  });
}

/* ----------------------------- Sign out --------------------------------- */

async function performSignOut() {
  if (busy) return;
  busy = true;
  signingOut = true;

  try {
    const saved = await store.flush();

    if (!saved) {
      const signOutAnyway = await confirmDialog({
        title: t("settings.signOutUnsavedTitle"),
        message: t("settings.signOutUnsavedText"),
        confirmLabel: t("settings.signOutAnyway"),
        cancelLabel: t("settings.staySignedIn"),
        danger: true
      });

      if (!signOutAnyway) return;
    }

    if (activeCleanup) {
      try {
        activeCleanup();
      } catch (error) {
        console.error(error);
      }
      activeCleanup = null;
    }

    cookingView.reset?.();
    await auth.signOut();
    store.destroy();
    drive.resetCache();
    await releaseWakeLock();

    setBackHandler(null);
    offlineNotified = false;
    setSplashWarning("");

    const opened = await openApp(null);
    if (!opened) {
      elements.view.innerHTML = "";
      elements.app.hidden = true;
      elements.splash.hidden = false;
      setSplashHint(t("splash.tapToStart"));
      setSplashDisabled(false);
    }

    applyChrome();
    toast(t("settings.signedOut"));
  } catch (error) {
    console.error(error);
    toast(t("common.error"), "error");
  } finally {
    signingOut = false;
    busy = false;
  }
}

/* ------------------------------- Boot ----------------------------------- */

function bindEvents() {
  elements.splashButton?.addEventListener("click", handleSplashClick);
  elements.splashPrivacyTitle?.addEventListener("click", () => openManual("privacy"));

  elements.headerBack?.addEventListener("click", () => {
    if (backHandler) backHandler();
  });

  elements.homeButton?.addEventListener("click", () => {
    showTab("cooking");
  });

  elements.settingsButton?.addEventListener("click", openSettings);

  for (const button of elements.tabButtons) {
    button.addEventListener("click", () => showTab(button.dataset.tab));
  }

  window.addEventListener("online", () => {
    updateOfflineBanner();
    store.retrySave();
  });

  window.addEventListener("pagehide", () => {
    store.flush().catch(() => {});
  });

  store.subscribe(handleStoreEvent);
}

async function boot() {
  setLanguage(detectLanguage(navigator.language));
  applyChrome();
  setSplashHint(t("splash.tapToStart"));
  setSplashWarning("");
  setSplashDisabled(false);
  bindEvents();
  bindKeyboardState();   // <- new line
  prepareAuth();
}

const EDITABLE = "input, textarea, select, [contenteditable='true']";
let keyboardTimer = null;

function updateKeyboardState() {
  const active = document.activeElement;
  const editing = active && active.matches?.(EDITABLE);
  document.body.classList.toggle("keyboard-open", Boolean(editing));
}

function bindKeyboardState() {
  document.addEventListener("focusin", (event) => {
    clearTimeout(keyboardTimer);
    if (event.target.matches?.(EDITABLE)) {
      document.body.classList.add("keyboard-open");
    }
  });

  document.addEventListener("focusout", () => {
    clearTimeout(keyboardTimer);
    keyboardTimer = setTimeout(updateKeyboardState, 150);
  });
}

boot();