/*
 * Pantry — application state and persistence.
 *
 * Guest mode is stored in localStorage. In Drive mode, Drive is the source of
 * truth and localStorage keeps a cache so the app can show recipes instantly
 * and keep working for a while when the network is unavailable. Drive saves
 * are debounced and retried on the next change or when the browser comes back
 * online.
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
const GUEST_KEY = "pantry.guest.v1";
const GUEST_OWNER_KEY = "pantry.guest.owner.v1";

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

function readGuest() {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeGuest(data) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function clearGuest() {
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {
    /* Ignore. */
  }
}

function readOwner() {
  try {
    return localStorage.getItem(GUEST_OWNER_KEY) || "";
  } catch {
    return "";
  }
}

function writeOwner(sub) {
  try {
    if (sub) localStorage.setItem(GUEST_OWNER_KEY, sub);
  } catch {
    /* Ignore. */
  }
}

/* ------------------------------ Loading -------------------------------- */

function cancelPendingSave() {
  if (saveTimer) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
}

function initGuest(detectedLanguage = "en") {
  const stored = readGuest();
  const data = normalizeData(stored, detectedLanguage);
  let needsWrite = !stored;

  if (!data.settings.languageConfirmed) {
    data.settings.language = normalizeLanguage(detectedLanguage || data.settings.language);
  }

  if (data.categories.length === 0) {
    data.categories = defaultCategories(data.settings.language);
    needsWrite = true;
  }

  state = {
    data,
    fileId: null,
    profileSub: "",
    mode: "guest",
    offline: false,
    dirty: false,
    lastError: null
  };

  applyLanguage(data.settings.language);
  if (needsWrite) writeGuest(data);
  emit({ type: "loaded", offline: false, error: null, mode: "guest" });

  return { data, offline: false, error: null };
}

/**
 * Load Drive data and reconcile it with the local cache. Returns the result
 * without installing it, so a failed sign-in can leave guest mode untouched.
 */
async function loadDriveData(profile, detectedLanguage = "en") {
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

  return { data, fileId, offline, needsPush, loadError, sub };
}

async function initDrive(profile, detectedLanguage = "en") {
  const result = await loadDriveData(profile, detectedLanguage);

  state = {
    data: result.data,
    fileId: result.fileId,
    profileSub: result.sub,
    mode: "drive",
    offline: result.offline,
    dirty: false,
    lastError: result.loadError
  };

  applyLanguage(result.data.settings.language);
  writeCache(result.sub, result.data);
  writeGuest(result.data);
  writeOwner(result.sub);
  emit({ type: "loaded", offline: result.offline, error: result.loadError, mode: "drive" });

  if (result.needsPush) scheduleSave(true);

  return { data: result.data, offline: result.offline, error: result.loadError };
}

/** Merge guest data into Drive data without replacing any Drive recipes. */
function mergeData(driveData, guestData) {
  const merged = {
    version: DATA_VERSION,
    recipes: driveData.recipes.map((recipe) => ({ ...recipe })),
    categories: [...driveData.categories],
    subcategories: {},
    settings: { ...driveData.settings },
    updatedAt: new Date().toISOString()
  };

  for (const [category, names] of Object.entries(driveData.subcategories || {})) {
    merged.subcategories[category] = [...names];
  }

  const ids = new Set(merged.recipes.map((recipe) => recipe.id));
  const titles = new Set(merged.recipes.map((recipe) => recipe.title.toLowerCase()));

  for (const recipe of guestData.recipes) {
    const title = recipe.title.toLowerCase();
    if (ids.has(recipe.id) || titles.has(title)) continue;
    merged.recipes.push({ ...recipe });
    ids.add(recipe.id);
    titles.add(title);
  }

  const categoryByKey = new Map(
    merged.categories.map((category) => [category.toLowerCase(), category])
  );

  const ensureCategory = (name) => {
    const value = String(name || "").trim();
    if (!value) return "";
    const key = value.toLowerCase();
    const existing = categoryByKey.get(key);
    if (existing) return existing;
    merged.categories.push(value);
    categoryByKey.set(key, value);
    return value;
  };

  for (const recipe of merged.recipes) {
    const category = ensureCategory(recipe.category);
    if (category) recipe.category = category;
  }
  for (const category of guestData.categories) {
    ensureCategory(category);
  }

  for (const [guestCategory, names] of Object.entries(guestData.subcategories || {})) {
    const target = ensureCategory(guestCategory);
    if (!target) continue;

    const existing = merged.subcategories[target] || [];
    const seen = new Set(existing.map((name) => name.toLowerCase()));

    for (const name of names) {
      const value = String(name || "").trim();
      if (!value || seen.has(value.toLowerCase())) continue;
      existing.push(value);
      seen.add(value.toLowerCase());
    }

    if (existing.length) merged.subcategories[target] = existing;
  }

  return merged;
}

/**
 * Sign in to Drive. Guest recipes, categories, and subcategories are merged
 * into the Drive data first. The guest copy is cleared only after the merged
 * data has been saved successfully.
 */
export async function login(profile) {
  if (!profile) throw new Error("Profile is required.");

  if (state?.mode === "drive") {
    return { data: state.data, saved: true, merged: false };
  }

  cancelPendingSave();

  const guestSource = state?.mode === "guest"
    ? JSON.parse(JSON.stringify(state.data))
    : readGuest();

  if (state?.mode === "guest") writeGuest(state.data);

  const detectedLanguage = guestSource?.settings?.language || "en";
  const localOwner = readOwner();
  // Local recipes are merged only when the same account signs back in.
  const sameAccount = !localOwner || localOwner === profile.sub;
  const guestData = normalizeData(sameAccount ? guestSource : null, detectedLanguage);
  const result = await loadDriveData(profile, detectedLanguage);
  const merged = mergeData(result.data, guestData);

  state = {
    data: merged,
    fileId: result.fileId,
    profileSub: result.sub,
    mode: "drive",
    offline: result.offline,
    dirty: true,
    lastError: result.loadError
  };

  applyLanguage(merged.settings.language);
  writeCache(result.sub, merged);
  writeGuest(merged);
  writeOwner(result.sub);
  emit({ type: "loaded", offline: result.offline, error: result.loadError, mode: "drive" });

  const saved = await runSave();

  return { data: merged, saved, merged: true, offline: state?.offline };
}

/**
 * Load local guest data, or Drive data when a profile is supplied.
 * Throws only when Drive has neither data nor a usable cache.
 */
export async function init({ profile, detectedLanguage = "en" } = {}) {
  return profile ? initDrive(profile, detectedLanguage) : initGuest(detectedLanguage);
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

export function getMode() {
  return state?.mode || "guest";
}

export function hasLocalData() {
  return Boolean(readGuest());
}

/* ----------------------------- Mutations ------------------------------- */

function touch() {
  if (!state) return;
  state.data.updatedAt = new Date().toISOString();
  state.dirty = true;
  writeGuest(state.data); // local copy is always kept
  if (state.mode === "drive") writeCache(state.profileSub, state.data);
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

export function updateRecipes(ids, changes = {}) {
  if (!state) return 0;

  const targets = new Set(ids || []);
  if (!targets.size) return 0;

  const hasCategory = changes.category !== undefined;
  const hasSubcategory = changes.subcategory !== undefined;
  if (!hasCategory && !hasSubcategory) return 0;

  const category = hasCategory ? String(changes.category || "").trim() : "";
  const subcategory = hasSubcategory ? String(changes.subcategory || "").trim() : "";
  const now = new Date().toISOString();
  let updated = 0;

  for (const recipe of state.data.recipes) {
    if (!targets.has(recipe.id)) continue;

    const categoryChanged = hasCategory && recipe.category !== category;
    const subcategoryChanged = hasSubcategory && recipe.subcategory !== subcategory;

    if (!categoryChanged && !subcategoryChanged) continue;

    if (categoryChanged) recipe.category = category;
    if (hasSubcategory) recipe.subcategory = subcategory;
    else if (categoryChanged) recipe.subcategory = "";

    recipe.updatedAt = now;
    updated += 1;
  }

  if (updated) touch();
  return updated;
}

export function deleteRecipes(ids) {
  if (!state) return 0;

  const targets = new Set(ids || []);
  if (!targets.size) return 0;

  const next = state.data.recipes.filter((recipe) => !targets.has(recipe.id));
  const removed = state.data.recipes.length - next.length;
  if (!removed) return 0;

  state.data.recipes = next;
  touch();
  return removed;
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

export function renameSubcategory(category, fromName, toName) {
  if (!state) return { ok: false, reason: "missing" };

  const parent = String(category || "").trim();
  const from = String(fromName || "").trim();
  const to = String(toName || "").trim();

  if (!state.data.categories.includes(parent)) return { ok: false, reason: "missing" };
  if (!to) return { ok: false, reason: "empty" };

  const list = state.data.subcategories[parent] || [];
  if (!list.includes(from)) return { ok: false, reason: "missing" };
  if (from === to) return { ok: true, value: to };

  const duplicate = list.some((item) => (
    item.toLowerCase() === to.toLowerCase() && item !== from
  ));
  if (duplicate) return { ok: false, reason: "duplicate" };

  state.data.subcategories[parent] = list.map((item) => (item === from ? to : item));

  const now = new Date().toISOString();
  for (const recipe of state.data.recipes) {
    if (recipe.category === parent && recipe.subcategory === from) {
      recipe.subcategory = to;
      recipe.updatedAt = now;
    }
  }

  touch();
  return { ok: true, value: to };
}

export function deleteSubcategory(category, name) {
  if (!state) return { ok: false, reason: "missing" };

  const parent = String(category || "").trim();
  const value = String(name || "").trim();
  if (!state.data.categories.includes(parent)) return { ok: false, reason: "missing" };

  const list = state.data.subcategories[parent] || [];
  if (!list.includes(value)) return { ok: false, reason: "missing" };

  const next = list.filter((item) => item !== value);
  if (next.length) state.data.subcategories[parent] = next;
  else delete state.data.subcategories[parent];

  const now = new Date().toISOString();
  for (const recipe of state.data.recipes) {
    if (recipe.category === parent && recipe.subcategory === value) {
      recipe.subcategory = "";
      recipe.updatedAt = now;
    }
  }

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

async function runSave() {
  if (!state) return true;
  if (currentSave) return currentSave;
  if (!state.dirty) return true;

  const snapshot = JSON.parse(JSON.stringify(state.data));
  state.dirty = false;

  if (state.mode === "guest") {
    const saved = writeGuest(snapshot);
    if (!saved) {
      state.dirty = true;
      state.lastError = new Error("Could not save local data.");
      emit({ type: "save-error", error: state.lastError });
      return false;
    }
    state.lastError = null;
    emit({ type: "saved" });
    return true;
  }

  const config = getConfig();

  currentSave = (async () => {
    if (!state) return true;

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

/** Clear in-memory state and the current account's Drive cache. Guest data is kept. */
export function destroy() {
  cancelPendingSave();
  if (state?.mode === "drive" && state.profileSub) clearCache(state.profileSub);
  state = null;
}
