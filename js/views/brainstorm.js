/*
 * Pantry — Brainstorm tab placeholder.
 */

import { t } from "../i18n.js";
import { escapeHtml, icon } from "../ui.js";

export function render(root) {
  const steps = [
    t("brainstorm.step1"),
    t("brainstorm.step2"),
    t("brainstorm.step3"),
    t("brainstorm.step4")
  ];

  root.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${escapeHtml(t("brainstorm.title"))}</h1>
      <span class="badge badge--soon">${escapeHtml(t("brainstorm.soon"))}</span>
    </div>

    <section class="placeholder">
      <div class="placeholder__icon" aria-hidden="true">${icon("bulb")}</div>
      <h2 class="placeholder__title">${escapeHtml(t("brainstorm.placeholderTitle"))}</h2>
      <p class="placeholder__text">${escapeHtml(t("brainstorm.placeholderText"))}</p>
      <div class="placeholder__flow">
        ${steps.map((step, index) => `
          <div class="placeholder__step">
            <span class="placeholder__step-num" aria-hidden="true">${index + 1}</span>
            <span>${escapeHtml(step)}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}
