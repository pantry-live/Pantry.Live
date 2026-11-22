import assert from "node:assert/strict";

const memory = new Map();

globalThis.localStorage = {
  getItem(key) {
    return memory.has(key) ? memory.get(key) : null;
  },
  setItem(key, value) {
    memory.set(key, String(value));
  },
  removeItem(key) {
    memory.delete(key);
  }
};

globalThis.window = {
  setTimeout: (...args) => setTimeout(...args),
  clearTimeout: (...args) => clearTimeout(...args)
};

const store = await import("../js/store.js");

await store.init({ detectedLanguage: "en" });

const ids = ["Bulk one", "Bulk two", "Bulk three"].map((title) => (
  store.addRecipe({
    title,
    category: "Dinner",
    subcategory: "",
    ingredients: "",
    steps: ""
  }).id
));

await store.flush();

let saves = 0;
store.subscribe((event) => {
  if (event.type === "saved") saves += 1;
});

const removed = store.deleteRecipes(ids);
await store.flush();

assert.equal(removed, 3);
assert.equal(store.getRecipes().length, 0);
assert.equal(saves, 1);

console.log("ok: bulk delete of 3 recipes triggered 1 save");
