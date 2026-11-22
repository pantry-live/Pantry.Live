/*
 * Pantry — account card and sign-in/sign-out, shown at the top of Settings.
 */

import * as auth from "../auth.js";
import * as store from "../store.js";
import { escapeHtml, icon, confirmDialog, toast } from "../ui.js";
import { t } from "../i18n.js";

export function accountHtml() {
  const mode = store.getMode();
  const profile = auth.getProfile();
  const isDrive = mode === "drive";
  const name = profile?.name || t("profile.googleAccount");

  return `
      <section class="settings-card" aria-label="${escapeHtml(t("profile.title"))}">
        <button class="settings-row settings-row--button${isDrive ? " settings-row--danger" : ""}"
          type="button" data-action="${isDrive ? "sign-out" : "sign-in"}"
          style="position: relative; padding-right: 6rem;">
          <span class="badge" style="position: absolute; top: 12px; right: 2px;">
            ${escapeHtml(isDrive ? t("profile.driveBadge") : t("profile.guestBadge"))}
          </span>
          <span class="settings-row__text">
            <span class="account-name">
              ${icon("user")}
              <span>${escapeHtml(isDrive ? name : t("profile.guestName"))}</span>
            </span>
            <span class="settings-row__desc">
              ${escapeHtml(isDrive ? t("profile.driveHint") : t("profile.guestHint"))}
            </span>
            <span class="settings-row__title">
              ${escapeHtml(isDrive ? t("profile.signOut") : t("profile.signIn"))}
            </span>
          </span>
        </button>
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