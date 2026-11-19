/*
 * Pantry — profile: guest mode, Google Drive sign-in, and sign-out.
 */

import * as auth from "../auth.js";
import * as store from "../store.js";
import { escapeHtml, icon, confirmDialog, toast } from "../ui.js";
import { t } from "../i18n.js";

/**
 * One account card, Apple ID style: the account header on top,
 * then a divider, then the sign-in or sign-out row. Used by Settings.
 */
export function accountHtml() {
  const mode = store.getMode();
  const profile = auth.getProfile();
  const name = profile?.name || t("profile.googleAccount");

  return `
      <section class="settings-card" aria-label="${escapeHtml(t("profile.title"))}">
        <div class="settings-row">
          <div class="settings-row__text">
            <div class="account-name">
              ${icon("user")}
              <span>${escapeHtml(mode === "drive" ? name : t("profile.guestName"))}</span>
            </div>
            <div class="settings-row__desc">
              ${escapeHtml(mode === "drive" ? t("profile.driveHint") : t("profile.guestHint"))}
            </div>
          </div>
          <span class="badge">${escapeHtml(mode === "drive" ? t("profile.driveBadge") : t("profile.guestBadge"))}</span>
        </div>

        <div style="border-top: 1px solid rgba(127, 127, 127, 0.25);">
          ${mode === "drive" ? `
            <button class="settings-row settings-row--button settings-row--danger"
              type="button" data-action="sign-out">
              <span class="settings-row__text">
                <span class="settings-row__title">${escapeHtml(t("profile.signOut"))}</span>
                <span class="settings-row__desc">${escapeHtml(t("profile.signOutHint"))}</span>
              </span>
              <span class="settings-row__control" aria-hidden="true">${icon("arrow-right")}</span>
            </button>
          ` : `
            <button class="settings-row settings-row--button" type="button" data-action="sign-in">
              <span class="settings-row__text">
                <span class="settings-row__title">${escapeHtml(t("profile.signIn"))}</span>
                <span class="settings-row__desc">${escapeHtml(t("profile.signInHint"))}</span>
              </span>
              <span class="settings-row__control" aria-hidden="true">${icon("arrow-right")}</span>
            </button>
          `}
        </div>
      </section>
  `;
}

/** Wires the sign-in and sign-out buttons inside a root element. */
export function bindAccountActions(root, ctx) {
  root.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;

    if (action === "sign-out") {
      handleSignOut(ctx);
    } else if (action === "sign-in") {
      await handleSignIn(event.target.closest("[data-action]"), ctx);
    }
  });
}

export function render(root, ctx) {
  ctx.setBack(() => ctx.closeSettings());

  root.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${escapeHtml(t("profile.title"))}</h1>
    </div>

    <div class="settings">
      ${accountHtml()}
    </div>
  `;

  bindAccountActions(root, ctx);
}

async function handleSignIn(button, ctx) {
  if (button?.disabled) return;
  if (button) button.disabled = true;

  try {
    const session = await auth.signIn();
    const result = await store.login(session.profile);

    ctx.updateChrome();
    ctx.rerender();

    if (result.saved) toast(t("profile.signedIn"), "success");
    else toast(t("profile.signedInUnsaved"), "error");
  } catch (error) {
    console.error(error);

    switch (error?.code) {
      case "auth_denied":
      case "popup_closed":
        toast(t("errors.authDenied"), "error");
        break;
      case "config_missing":
        toast(t("splash.configMissing"), "error");
        break;
      case "gis_unavailable":
        toast(t("splash.gisUnavailable"), "error");
        break;
      default:
        toast(t("errors.authFailed"), "error");
    }
  } finally {
    if (button?.isConnected) button.disabled = false;
  }
}

async function handleSignOut(ctx) {
  const confirmed = await confirmDialog({
    title: t("profile.signOutTitle"),
    message: t("profile.signOutText"),
    confirmLabel: t("profile.signOut"),
    cancelLabel: t("common.cancel"),
    danger: true
  });

  if (!confirmed) return;

  await ctx.signOut();
}