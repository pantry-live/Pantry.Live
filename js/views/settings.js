/*
 * Pantry — settings, manual, language, and tutorial.
 */

import { LANGUAGES, t } from "../i18n.js";
import { escapeHtml, icon, confirmDialog, toast } from "../ui.js";
import { exportRecipes } from "../exchange.js";
import { importFile } from "../importer.js";
import { openManual } from "../manual.js";
import { clearAiSession } from "../ai-auth.js";
import { hasConnection } from "../brainstorm-api.js";
import { accountHtml, bindAccountActions } from "./profile.js";
import * as store from "../store.js";

export function render(root, ctx) {
  ctx.setBack(() => ctx.closeSettings());

  const language = store.getSettings().language || "en";
  const brainstormConnected = hasConnection();

  root.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${escapeHtml(t("settings.title"))}</h1>
    </div>

    <div class="settings">
      ${accountHtml()}

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

      <section class="settings-card" aria-label="${escapeHtml(t("settings.brainstormTitle"))}">
        <div class="settings-row">
          <span class="settings-row__text">
            <span class="settings-row__title">${escapeHtml(t("settings.brainstormTitle"))}</span>
            <span class="settings-row__desc">
              ${escapeHtml(t(brainstormConnected
                ? "settings.brainstormConnectedHint"
                : "settings.brainstormNotConnectedHint"))}
            </span>
          </span>
          <span class="badge${brainstormConnected ? " badge--connected" : ""}">
            ${escapeHtml(t(brainstormConnected
              ? "settings.brainstormConnected"
              : "settings.brainstormNotConnected"))}
          </span>
        </div>

        ${brainstormConnected ? `
          <button class="settings-row settings-row--button settings-row--danger"
            type="button" data-action="disconnect-brainstorm">
            <span class="settings-row__text">
              <span class="settings-row__title">${escapeHtml(t("settings.disconnectBrainstorm"))}</span>
              <span class="settings-row__desc">${escapeHtml(t("settings.disconnectBrainstormHint"))}</span>
            </span>
            <span class="settings-row__control" aria-hidden="true">${icon("arrow-right")}</span>
          </button>
        ` : ""}
      </section>

      <div class="settings-tiles">
        <button class="settings-tile" type="button" data-action="import">
          <span class="settings-tile__icon" aria-hidden="true">${icon("download")}</span>
          <span class="settings-tile__title">${escapeHtml(t("settings.importTitle"))}</span>
          <span class="settings-tile__desc">${escapeHtml(t("settings.importHint"))}</span>
        </button>
        <button class="settings-tile" type="button" data-action="export">
          <span class="settings-tile__icon" aria-hidden="true">${icon("upload")}</span>
          <span class="settings-tile__title">${escapeHtml(t("settings.exportTitle"))}</span>
          <span class="settings-tile__desc">${escapeHtml(t("settings.exportHint"))}</span>
        </button>
      </div>

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
    } else if (action === "disconnect-brainstorm") {
      handleDisconnectBrainstorm(ctx);
    } else if (action === "export") {
      handleExport();
    } else if (action === "import") {
      handleImport();
    }
  });

  bindAccountActions(root, ctx);
}

async function handleDisconnectBrainstorm(ctx) {
  const confirmed = await confirmDialog({
    title: t("settings.disconnectBrainstormTitle"),
    message: t("settings.disconnectBrainstormText"),
    confirmLabel: t("settings.disconnectBrainstorm"),
    cancelLabel: t("common.cancel"),
    danger: true
  });

  if (!confirmed) return;

  clearAiSession();
  toast(t("settings.brainstormDisconnected"));
  ctx.rerender();
}

function handleExport() {
  const recipes = store.getRecipes();
  if (!recipes.length) {
    toast(t("settings.exportEmpty"));
    return;
  }

  try {
    exportRecipes(recipes);
    toast(t("settings.exportDone"), "success");
  } catch (error) {
    console.error(error);
    toast(t("common.error"), "error");
  }
}

function handleImport() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".zip,.txt,application/zip,text/plain";

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      const result = await importFile(file);
      if (!result.imported) {
        toast(t("settings.importNone"), "error");
        return;
      }
      toast(
        t("settings.importDone", { count: result.imported, skipped: result.skipped }),
        "success"
      );
    } catch (error) {
      console.error(error);
      toast(t("settings.importError"), "error");
    }
  });

  input.click();
}