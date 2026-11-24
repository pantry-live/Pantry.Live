/*
 * Pantry — recipe text format and export.
 *
 * Each recipe is one plain-text file with a fixed layout, so the importer can
 * read it back exactly:
 *
 *   Title: Lentil curry
 *   Category: Dinner
 *   Subcategory: Curry
 *   Tags:
 *
 *   Ingredients:
 *   2 cloves of garlic
 *   250 g red lentils
 *
 *   Steps:
 *   Chop the onion.
 *   Simmer everything.
 */

import { createZip } from "./zip.js";

const INVALID_FILENAME_CHARS = /[\\/:*?"<>|\u0000-\u001f]/g;

export function formatRecipeText(recipe) {
  return [
    `Title: ${recipe.title}`,
    `Category: ${recipe.category || ""}`,
    `Subcategory: ${recipe.subcategory || ""}`,
    "Tags:",
    "",
    "Ingredients:",
    String(recipe.ingredients || "").trimEnd(),
    "",
    "Steps:",
    String(recipe.steps || "").trimEnd(),
    ""
  ].join("\n");
}

function safeBaseName(title) {
  const cleaned = String(title || "")
    .replace(INVALID_FILENAME_CHARS, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return cleaned || "recipe";
}

function uniqueFileName(base, used) {
  let name = `${base}.txt`;
  let counter = 2;
  while (used.has(name.toLowerCase())) {
    name = `${base} (${counter}).txt`;
    counter += 1;
  }
  used.add(name.toLowerCase());
  return name;
}

function buildRecipeZip(recipes) {
  const used = new Set();
  const files = recipes.map((recipe) => ({
    name: uniqueFileName(safeBaseName(recipe.title), used),
    text: formatRecipeText(recipe)
  }));
  return createZip(files);
}

/**
 * Share one recipe as plain text through the native share sheet.
 * Falls back to the clipboard when Web Share is unavailable.
 * Returns "shared", "copied", "cancelled", or "failed".
 */
export async function shareRecipeText(recipe) {
  const text = formatRecipeText(recipe);

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: recipe.title, text });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
    }
  }

  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return "failed";
  }

  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

/** Download recipes as a ZIP of text files. Saved to the device, not to Drive. */
export function exportRecipes(recipes, { downloadName = "" } = {}) {
  const blob = buildRecipeZip(recipes);
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const baseName = downloadName ? safeBaseName(downloadName) : `pantry-recipes-${date}`;

  const link = document.createElement("a");
  link.href = url;
  link.download = `${baseName}.zip`;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}