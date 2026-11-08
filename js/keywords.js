/*
 * Pantry — keywords used to sort imported recipes.
 *
 * "category" is the English default name. It maps to the same position in the
 * default list for the current language, so Dinner becomes Diner in Dutch.
 * Keywords are matched as whole words, case-insensitive, in the title (weight 3),
 * the Tags line (weight 2), and the ingredients (weight 1). The best match wins.
 * Edit these lists to fit your own recipes.
 */

export const KEYWORD_RULES = [
  {
    category: "Breakfast",
    keywords: ["breakfast", "ontbijt", "pancake", "pancakes", "porridge", "oatmeal",
      "muesli", "granola", "toast", "omelette", "omelet", "waffle", "yogurt"],
    subcategories: [
      { name: "Sweet", keywords: ["pancake", "pancakes", "waffle", "granola", "muesli", "syrup"] }
    ]
  },
  {
    category: "Lunch",
    keywords: ["lunch", "sandwich", "wrap", "salad", "soup", "soep", "quesadilla", "bowl"],
    subcategories: [
      { name: "Soup", keywords: ["soup", "soep", "broth"] },
      { name: "Salad", keywords: ["salad", "salade"] }
    ]
  },
  {
    category: "Dinner",
    keywords: ["dinner", "diner", "curry", "pasta", "lasagne", "stew", "risotto", "roast",
      "casserole", "chili", "stir-fry", "bolognese", "lentil", "linzen", "rice", "rijst"],
    subcategories: [
      { name: "Pasta", keywords: ["pasta", "spaghetti", "penne", "lasagne", "bolognese", "noodles"] },
      { name: "Curry", keywords: ["curry", "masala", "tikka", "korma"] },
      { name: "Soup", keywords: ["soup", "soep", "broth"] }
    ]
  }
];