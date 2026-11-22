import assert from "node:assert/strict";
import test from "node:test";

import { ingredientName, matchStepIngredients } from "../js/recipe.js";

test("matches a plural with the light stem rule (ui / uien)", () => {
  const result = matchStepIngredients(["2 uien"], "Snipper de uien.");

  assert.equal(result.top, "2 uien");
  assert.equal(result.others, 0);
  assert.deepEqual(result.matches, ["2 uien"]);
});

test("does not match inside a compound word", () => {
  const result = matchStepIngredients(["1 el olie"], "Verwarm de olijfolie.");

  assert.equal(result.top, null);
  assert.equal(result.others, 0);
  assert.deepEqual(result.matches, []);
});

test("counts generic staples at half weight", () => {
  const result = matchStepIngredients(
    ["1 glas water", "1 kop rijst"],
    "Kook de rijst in het water."
  );

  assert.equal(result.top, "1 kop rijst");
  assert.equal(result.others, 1);
  assert.deepEqual(result.matches, ["1 glas water", "1 kop rijst"]);
});

test("breaks ties by the first listed ingredient", () => {
  const result = matchStepIngredients(["1 ui", "1 ei"], "Meng de ui en het ei.");

  assert.equal(result.top, "1 ui");
  assert.equal(result.others, 1);
  assert.deepEqual(result.matches, ["1 ui", "1 ei"]);
});

test("returns no match when nothing appears in the step", () => {
  const result = matchStepIngredients(["2 uien"], "Verwarm de oven.");

  assert.equal(result.top, null);
  assert.equal(result.others, 0);
  assert.deepEqual(result.matches, []);
});

test("handles an empty step", () => {
  const result = matchStepIngredients(["2 uien"], "");

  assert.equal(result.top, null);
  assert.equal(result.others, 0);
  assert.deepEqual(result.matches, []);
});

test("drops text after a comma and inside brackets", () => {
  assert.equal(ingredientName("2 uien, fijngesneden"), "uien");
  assert.equal(ingredientName("1 blik tomaten (400 g)"), "tomaten");

  const comma = matchStepIngredients(["2 uien, fijngesneden"], "Snipper de uien.");
  assert.equal(comma.top, "2 uien, fijngesneden");

  const bracket = matchStepIngredients(["1 blik tomaten (400 g)"], "Voeg de tomaten toe.");
  assert.equal(bracket.top, "1 blik tomaten (400 g)");

  const ignored = matchStepIngredients(
    ["2 uien, fijngesneden", "1 blik tomaten (400 g)"],
    "Snijd alles fijngesneden en verwarm 400 g."
  );
  assert.deepEqual(ignored.matches, []);
});

test("uses Unicode-aware words", () => {
  const result = matchStepIngredients(["1 el crème fraîche"], "Voeg de crème toe.");

  assert.equal(result.top, "1 el crème fraîche");
  assert.deepEqual(result.matches, ["1 el crème fraîche"]);
});
