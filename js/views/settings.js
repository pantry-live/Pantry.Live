/*
 * Pantry — settings, manual, language, tutorial, and sign-out.
 */

import * as auth from "../auth.js";
import { LANGUAGES, getManual, t } from "../i18n.js";
import { escapeHtml, icon, openModal, confirmDialog, toast } from "../ui.js";
import * as store from "../store.js";

export function render(root, ctx) {
  ctx.setBack(() => ctx.closeSettings());

  const profile = auth.getProfile();
  const name = profile?.name || profile?.email || t("settings.googleAccount");
  const language = store.getSettings().language || "en";

  root.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${escapeHtml(t("settings.title"))}</h1>
    </div>

    <div class="settings">
      <section class="settings-card" aria-label="${escapeHtml(t("settings.account"))}">
        <div class="settings-row">
          <div class="settings-row__text">
            <div class="account-name">
              ${icon("user")}
              <span>${escapeHtml(name)}</span>
            </div>
            <div class="settings-row__desc">${escapeHtml(t("settings.dataLocation"))}</div>
          </div>
        </div>
      </section>

      <section class="settings-card" aria-label="${escapeHtml(t("settings.language"))}">
        <div class="settings-row">
          <div class="settings-row__text">
            <div class="settings-row__title">${escapeHtml(t("settings.language"))}</div>
            <div class="settings-row__desc">${escapeHtml(t("settings.languageHint"))}</div>
          </div>
          <div class="settings-row__control">
            <label class="visually-hidden" for="settings-language">
              ${escapeHtml(t("settings.language"))}
            </label>
            <select class="select" id="settings-language" data-ref="language">
              ${LANGUAGES.map((option) => `
                <option value="${option.code}" ${option.code === language ? "selected" : ""}>
                  ${escapeHtml(option.nativeName)}
                </option>
              `).join("")}
            </select>
          </div>
        </div>
      </section>

      <section class="settings-card">
        <button class="settings-row settings-row--button" type="button" data-action="tutorial">
          <span class="settings-row__text">
            <span class="settings-row__title">${escapeHtml(t("settings.tutorial"))}</span>
            <span class="settings-row__desc">${escapeHtml(t("settings.tutorialHint"))}</span>
          </span>
          <span class="settings-row__control" aria-hidden="true">${icon("arrow-right")}</span>
        </button>

        <button class="settings-row settings-row--button" type="button" data-action="manual">
          <span class="settings-row__text">
            <span class="settings-row__title">${escapeHtml(t("settings.manual"))}</span>
            <span class="settings-row__desc">${escapeHtml(t("settings.manualHint"))}</span>
          </span>
          <span class="settings-row__control" aria-hidden="true">${icon("book")}</span>
        </button>
      </section>

      <section class="settings-card" aria-label="${escapeHtml(t("settings.signOut"))}">
        <button class="settings-row settings-row--button settings-row--danger"
          type="button" data-action="sign-out">
          <span class="settings-row__text">
            <span class="settings-row__title">${escapeHtml(t("settings.signOut"))}</span>
            <span class="settings-row__desc">${escapeHtml(t("settings.signOutHint"))}</span>
          </span>
          <span class="settings-row__control" aria-hidden="true">${icon("arrow-right")}</span>
        </button>
      </section>

      <section class="settings-card" aria-label="${escapeHtml(t("settings.about"))}">
        <div class="settings-row">
          <div class="settings-row__text">
            <div class="settings-row__title">${escapeHtml(t("settings.about"))}</div>
            <div class="settings-row__desc">${escapeHtml(t("settings.version"))}</div>
          </div>
          <div class="settings-row__desc">${escapeHtml(t("settings.dataLocation"))}</div>
        </div>
      </section>
    </div>
  `;

  root.querySelector('[data-ref="language"]')?.addEventListener("change", (event) => {
    store.setLanguage(event.target.value);
    ctx.updateChrome();
    ctx.rerender();
    toast(t("settings.languageChanged"), "success");
  });

  root.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;

    if (action === "tutorial") {
      ctx.showTutorial();
    } else if (action === "manual") {
      openManual();
    } else if (action === "sign-out") {
      handleSignOut(ctx);
    }
  });
}

function openManual() {
  const wrapper = document.createElement("div");
  wrapper.className = "manual";
  wrapper.innerHTML = `
    ${getManual().map((section) => `
      <section class="manual__section">
        <h2>${escapeHtml(t(section.title))}</h2>
        <p>${escapeHtml(t(section.body))}</p>
      </section>
    `).join("")}
    <p class="manual__meta">${escapeHtml(t("manual.version"))}</p>
  `;

  openModal({
    title: t("manual.title"),
    body: wrapper,
    actions: [
      {
        label: t("common.close"),
        variant: "secondary"
      }
    ]
  });
}

async function handleSignOut(ctx) {
  const confirmed = await confirmDialog({
    title: t("settings.signOutTitle"),
    message: t("settings.signOutText"),
    confirmLabel: t("settings.signOut"),
    cancelLabel: t("settings.staySignedIn"),
    danger: true
  });

  if (!confirmed) return;

  await ctx.signOut();
}
