/*
 * Pantry — application state and persistence.
 *
 * Drive is the source of truth. localStorage keeps a cache so the app can
 * show recipes instantly and keep working for a while when the network is
 * unavailable. Saves are debounced and retried on the next change or when
 * the browser comes back online.
 */

import * as drive from "./drive.js";
import { getConfig } from "./auth.js";
import {
  defaultCategories,
  isDefaultCategorySet,
  normalizeLanguage,
  setLanguage as applyLanguage
} from "./i18n.js";

const DATA_VERSION = 1;
const SAVE_DELAY = 600;
const CACHE_PREFIX = "pantry.cache.v1.";

let state = null;
let saveTimer = null;
let currentSave = null;
const listeners = new Set();

/* ------------------------------ Events --------------------------------- */

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(event) {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error(error);
    }
  }
}

/* ----------------------------- Helpers --------------------------------- */

function makeId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {
    /* Fall through. */
  }
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function timestamp(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : 0;
}

function normalizeRecipe(raw) {
  if (!raw || typeof raw !== "object") return null;

  const title = String(raw.title || "").trim();
  if (!title) return null;

  const now = new Date().toISOString();
  return {
    id: String(raw.id || "") || makeId(),
    title,
    category: String(raw.category || "").trim(),
    subcategory: String(raw.subcategory || "").trim(),
    ingredients: String(raw.ingredients || ""),
    steps: String(raw.steps || ""),
    // The app always uses two base servings; this keeps old data compatible.
    baseServings: 2,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now
  };
}

function normalizeData(raw, detectedLanguage = "en") {
  const source = raw && typeof raw === "object" ? raw : {};
  const settingsSource = source.settings && typeof source.settings === "object"
    ? source.settings
    : {};

  const recipes = Array.isArray(source.recipes)
    ? source.recipes.map(normalizeRecipe).filter(Boolean)
    : [];

  const categories = Array.isArray(source.categories)
    ? [...new Set(source.categories.map((item) => String(item || "").trim()).filter(Boolean))]
    : [];

  // Keep categories referenced by old recipes visible in the chip row.
  for (const recipe of recipes) {
    if (recipe.category && !categories.includes(recipe.category)) {
      categories.push(recipe.category);
    }
  }

    // Subcategories are stored per category, e.g. { "Dinner": ["Pasta", "Curry"] }.
  const subcategories = {};
  const sourceSubcategories = source.subcategories && typeof source.subcategories === "object"
    ? source.subcategories
    : {};
  for (const category of categories) {
    const names = Array.isArray(sourceSubcategories[category]) ? sourceSubcategories[category] : [];
    const cleaned = [...new Set(names.map((item) => String(item || "").trim()).filter(Boolean))];
    if (cleaned.length) subcategories[category] = cleaned;
  }

  return {
    version: DATA_VERSION,
    recipes,
    categories,
    subcategories,
    settings: {
      language: normalizeLanguage(settingsSource.language || detectedLanguage || "en"),
      languageConfirmed: Boolean(settingsSource.languageConfirmed),
      welcomeSeen: Boolean(settingsSource.welcomeSeen),
      tutorialSeen: Boolean(settingsSource.tutorialSeen)
    },
    updatedAt: typeof source.updatedAt === "string"
      ? source.updatedAt
      : new Date().toISOString()
  };
}

function cacheKey(sub) {
  return `${CACHE_PREFIX}${sub || "default"}`;
}

function readCache(sub) {
  try {
    const raw = localStorage.getItem(cacheKey(sub));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(sub, data) {
  try {
    localStorage.setItem(cacheKey(sub), JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    /* Storage can be unavailable in private mode. */
  }
}

function clearCache(sub) {
  try {
    localStorage.removeItem(cacheKey(sub));
  } catch {
    /* Ignore. */
  }
}

/* ------------------------------ Loading -------------------------------- */

/**
 * Load Drive data, reconcile with the local cache, and install the state.
 * Throws only when there is neither Drive data nor a usable cache.
 */
export async function init({ profile, detectedLanguage = "en" } = {}) {
  const sub = profile?.sub || "";
  const cached = readCache(sub);
  const config = getConfig();

  let driveResult = null;
  let loadError = null;

  try {
    driveResult = await drive.loadData({
      folderName: config.driveFolderName,
      fileName: config.driveFileName
    });
  } catch (error) {
    if (error?.code === "auth_expired") throw error;
    loadError = error;
  }

  let data;
  let fileId = driveResult?.fileId || null;
  let offline = false;
  let needsPush = false;

  if (driveResult) {
    const driveData = driveResult.data;

    if (driveData && typeof driveData === "object") {
      const normalizedDrive = normalizeData(driveData, detectedLanguage);

      if (cached?.data) {
        const normalizedCache = normalizeData(cached.data, detectedLanguage);
        if (timestamp(normalizedCache.updatedAt) > timestamp(normalizedDrive.updatedAt)) {
          data = normalizedCache;
          needsPush = true;
        } else {
          data = normalizedDrive;
        }
      } else {
        data = normalizedDrive;
      }
    } else if (cached?.data) {
      // The Drive file is empty but a local copy exists.
      data = normalizeData(cached.data, detectedLanguage);
      needsPush = true;
    } else {
      data = normalizeData(null, detectedLanguage);
      needsPush = true;
    }
  } else if (cached?.data) {
    data = normalizeData(cached.data, detectedLanguage);
    offline = true;
    needsPush = true;
  } else {
    throw loadError || new Error("No data available.");
  }

  if (!data.settings.languageConfirmed) {
    data.settings.language = normalizeLanguage(detectedLanguage || data.settings.language);
  }

  if (data.settings.languageConfirmed && data.categories.length === 0) {
    data.categories = defaultCategories(data.settings.language);
    needsPush = true;
  }

  state = {
    data,
    fileId,
    profileSub: sub,
    offline,
    dirty: false,
    lastError: loadError
  };

  applyLanguage(data.settings.language);
  writeCache(sub, data);
  emit({ type: "loaded", offline, error: loadError });

  if (needsPush) scheduleSave(true);

  return { data, offline, error: loadError };
}

/* ------------------------------ Getters -------------------------------- */

export function getData() {
  return state?.data || null;
}

export function getRecipes() {
  return state?.data?.recipes || [];
}

export function getRecipe(id) {
  return getRecipes().find((recipe) => recipe.id === id) || null;
}

export function getCategories() {
  return state?.data?.categories || [];
}

export function getSettings() {
  return state?.data?.settings || {};
}

export function isOffline() {
  return Boolean(state?.offline);
}

export function getFileId() {
  return state?.fileId || null;
}

export function getProfileSub() {
  return state?.profileSub || "";
}

/* ----------------------------- Mutations ------------------------------- */

function touch() {
  if (!state) return;
  state.data.updatedAt = new Date().toISOString();
  state.dirty = true;
  writeCache(state.profileSub, state.data);
  scheduleSave(false);
}

export function addRecipe({ title, category, subcategory, ingredients, steps }) {
  if (!state) return null;

  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) return null;

  const now = new Date().toISOString();
  const recipe = {
    id: makeId(),
    title: cleanTitle,
    category: String(category || "").trim(),
    subcategory: String(subcategory || "").trim(),
    ingredients: String(ingredients || ""),
    steps: String(steps || ""),
    baseServings: 2,
    createdAt: now,
    updatedAt: now
  };

  state.data.recipes.unshift(recipe);
  touch();
  return recipe;
}

export function updateRecipe(id, changes) {
  if (!state) return null;

  const recipe = state.data.recipes.find((item) => item.id === id);
  if (!recipe) return null;

  if (changes.title !== undefined) {
    const title = String(changes.title || "").trim();
    if (!title) return null;
    recipe.title = title;
  }
  if (changes.category !== undefined) recipe.category = String(changes.category || "").trim();
  if (changes.subcategory !== undefined) recipe.subcategory = String(changes.subcategory || "").trim();
  if (changes.ingredients !== undefined) recipe.ingredients = String(changes.ingredients || "");
  if (changes.steps !== undefined) recipe.steps = String(changes.steps || "");

  recipe.updatedAt = new Date().toISOString();
  touch();
  return recipe;
}

export function deleteRecipe(id) {
  if (!state) return false;

  const next = state.data.recipes.filter((recipe) => recipe.id !== id);
  if (next.length === state.data.recipes.length) return false;

  state.data.recipes = next;
  touch();
  return true;
}

/** Swap default category names, and the recipes that use them, to the new language. Custom names are kept. */
function swapDefaultCategoryNames(fromLanguage, toLanguage) {
  const from = defaultCategories(fromLanguage);
  const to = defaultCategories(toLanguage);

  const renames = new Map();
  from.forEach((name, index) => {
    if (to[index] && to[index] !== name) renames.set(name, to[index]);
  });
  if (!renames.size) return;

  const renamed = state.data.categories.map((category) => renames.get(category) || category);
  state.data.categories = [...new Set(renamed)];

  state.data.recipes.forEach((recipe) => {
    if (renames.has(recipe.category)) recipe.category = renames.get(recipe.category);
  });
}

export function setLanguage(language) {
  if (!state) return;

  const next = normalizeLanguage(language);
  const previous = state.data.settings.language;

  if (previous === next) {
    applyLanguage(next);
    return;
  }

  swapDefaultCategoryNames(previous, next);

  state.data.settings.language = next;
  applyLanguage(next);
  touch();
  emit({ type: "language", language: next });
}

export function confirmLanguage(language) {
  if (!state) return null;

  const next = normalizeLanguage(language);
  const wasConfirmed = state.data.settings.languageConfirmed;

  state.data.settings.language = next;
  state.data.settings.languageConfirmed = true;

  if (state.data.categories.length === 0 || isDefaultCategorySet(state.data.categories)) {
    state.data.categories = defaultCategories(next);
  }

  applyLanguage(next);
  touch();
  emit({ type: "language", language: next });

  return { wasConfirmed };
}

export function markWelcomeSeen() {
  if (!state || state.data.settings.welcomeSeen) return;
  state.data.settings.welcomeSeen = true;
  touch();
}

export function markTutorialSeen() {
  if (!state || state.data.settings.tutorialSeen) return;
  state.data.settings.tutorialSeen = true;
  touch();
}

export function addCategory(name) {
  if (!state) return { ok: false, reason: "missing" };

  const value = String(name || "").trim();
  if (!value) return { ok: false, reason: "empty" };

  const exists = state.data.categories.some((category) => (
    category.toLowerCase() === value.toLowerCase()
  ));
  if (exists) return { ok: false, reason: "duplicate" };

  state.data.categories.push(value);
  touch();
  return { ok: true, value };
}

/** Add any default categories (in the current language) that are missing. Existing categories are kept. */
export function restoreDefaultCategories() {
  if (!state) return { ok: false, added: 0 };

  const existing = state.data.categories;
  const missing = defaultCategories().filter((name) => (
    !existing.some((category) => category.toLowerCase() === name.toLowerCase())
  ));

  if (!missing.length) return { ok: true, added: 0 };

  state.data.categories = [...existing, ...missing];
  touch();
  return { ok: true, added: missing.length };
}

export function renameCategory(fromName, toName) {
  if (!state) return { ok: false, reason: "missing" };

  const from = String(fromName || "").trim();
  const to = String(toName || "").trim();

  if (!to) return { ok: false, reason: "empty" };
  if (!state.data.categories.includes(from)) return { ok: false, reason: "missing" };
  if (from === to) return { ok: true, value: to };

  const duplicate = state.data.categories.some((category) => (
    category.toLowerCase() === to.toLowerCase() && category !== from
  ));
  if (duplicate) return { ok: false, reason: "duplicate" };

  state.data.categories = state.data.categories.map((category) => (
    category === from ? to : category
  ));
  for (const recipe of state.data.recipes) {
    if (recipe.category === from) recipe.category = to;
  }

    if (state.data.subcategories[from]) {
    state.data.subcategories[to] = state.data.subcategories[from];
    delete state.data.subcategories[from];
  }

  touch();
  return { ok: true, value: to };
}

export function deleteCategory(name) {
  if (!state) return { ok: false, reason: "missing" };

  const value = String(name || "").trim();
  if (!state.data.categories.includes(value)) return { ok: false, reason: "missing" };

  if (state.data.categories.length <= 1) {
    return { ok: false, reason: "last" };
  }

  const count = state.data.recipes.filter((recipe) => recipe.category === value).length;
  if (count > 0) return { ok: false, reason: "in_use", count };

  state.data.categories = state.data.categories.filter((category) => category !== value);
  delete state.data.subcategories[value];
  touch();
  return { ok: true };
}

export function getSubcategories(category) {
  if (!state) return [];
  return [...(state.data.subcategories[category] || [])];
}

export function addSubcategory(category, name) {
  if (!state) return { ok: false, reason: "missing" };

  const parent = String(category || "").trim();
  const value = String(name || "").trim();
  if (!state.data.categories.includes(parent)) return { ok: false, reason: "missing" };
  if (!value) return { ok: false, reason: "empty" };

  const list = state.data.subcategories[parent] || [];
  if (list.some((item) => item.toLowerCase() === value.toLowerCase())) {
    return { ok: false, reason: "duplicate" };
  }

  state.data.subcategories[parent] = [...list, value];
  touch();
  return { ok: true, value };
}

export function deleteSubcategory(category, name) {
  if (!state) return { ok: false, reason: "missing" };

  const parent = String(category || "").trim();
  const value = String(name || "").trim();
  const list = state.data.subcategories[parent] || [];
  if (!list.includes(value)) return { ok: false, reason: "missing" };

  for (const recipe of state.data.recipes) {
    if (recipe.category === parent && recipe.subcategory === value) recipe.subcategory = "";
  }

  const remaining = list.filter((item) => item !== value);
  if (remaining.length) state.data.subcategories[parent] = remaining;
  else delete state.data.subcategories[parent];

  touch();
  return { ok: true };
}

/* ------------------------------ Saving --------------------------------- */

function scheduleSave(immediate = false) {
  if (!state) return;

  if (saveTimer) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }

  if (immediate) {
    runSave();
    return;
  }

  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    runSave();
  }, SAVE_DELAY);
}

function runSave() {
  if (!state) return Promise.resolve(true);
  if (currentSave) return currentSave;
  if (!state.dirty) return Promise.resolve(true);

  const config = getConfig();

  currentSave = (async () => {
    if (!state) return true;

    const snapshot = JSON.parse(JSON.stringify(state.data));
    state.dirty = false;
    let success = false;

    try {
      const nextFileId = await drive.saveData(state.fileId, snapshot, {
        folderName: config.driveFolderName,
        fileName: config.driveFileName
      });

      if (!state) return true;

      state.fileId = nextFileId;
      state.offline = false;
      state.lastError = null;
      writeCache(state.profileSub, snapshot);
      emit({ type: "saved" });
      success = true;
      return true;
    } catch (error) {
      if (!state) return false;

      state.dirty = true;
      state.offline = true;
      state.lastError = error;
      writeCache(state.profileSub, state.data);
      emit({ type: "save-error", error });
      if (error?.code === "auth_expired") emit({ type: "auth-expired" });
      return false;
    } finally {
      currentSave = null;
      if (success && state?.dirty) scheduleSave(false);
    }
  })();

  return currentSave;
}

/** Flush pending changes. Returns true when everything was written. */
export async function flush() {
  if (!state) return true;

  if (saveTimer) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }

  if (currentSave) await currentSave;
  if (!state?.dirty) return true;

  return runSave();
}

/** Retry a previously failed save, e.g. after the browser comes online. */
export function retrySave() {
  if (state?.dirty) scheduleSave(true);
}

/** Clear in-memory state and the current account's local cache. */
export function destroy() {
  if (saveTimer) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (state?.profileSub) clearCache(state.profileSub);
  state = null;
}
