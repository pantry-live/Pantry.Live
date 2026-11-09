/*
 * Pantry — translations and language helpers.
 *
 * The app currently ships with Dutch and English. All user-facing text
 * lives in this file so adding another language later only means adding
 * another dictionary and a LANGUAGES entry.
 */

export const LANGUAGES = [
  { code: "nl", nativeName: "Nederlands", speech: "nl-NL", locale: "nl-NL" },
  { code: "en", nativeName: "English", speech: "en-US", locale: "en-US" }
];

const LANGUAGE_LABELS = {
  nl: { nl: "Nederlands", en: "Engels" },
  en: { nl: "Dutch", en: "English" }
};

const DEFAULT_CATEGORIES = {
  nl: ["Ontbijt", "Lunch", "Diner", "Snack"],
  en: ["Breakfast", "Lunch", "Dinner", "Snack"]
};

const VOICE_COMMANDS = {
  nl: ["volgende", "verder", "ga door", "klaar", "next"],
  en: ["next", "continue", "forward", "done", "volgende"]
};

/* -------------------------------------------------------------------------
 * Strings
 * ---------------------------------------------------------------------- */

const STRINGS = {
  nl: {
    common: {
      back: "Terug",
      close: "Sluiten",
      cancel: "Annuleren",
      save: "Opslaan",
      saving: "Opslaan…",
      add: "Toevoegen",
      edit: "Bewerken",
      delete: "Verwijderen",
      rename: "Hernoemen",
      continue: "Doorgaan",
      skip: "Overslaan",
      next: "Volgende",
      done: "Klaar",
      retry: "Opnieuw proberen",
      confirm: "Bevestigen",
      loading: "Laden…",
      all: "Alles",
      search: "Zoeken",
      clear: "Wissen",
      error: "Er ging iets mis.",
      offline: "Je bent offline. Je ziet de laatst bewaarde gegevens.",
      savedLocally: "Lokaal bewaard. We proberen het later opnieuw.",
      sessionExpired: "Je sessie is verlopen.",
      reauthenticate: "Opnieuw inloggen",
      signOut: "Uitloggen",
      unsupported: "Niet ondersteund in deze browser.",
      unknownError: "Onbekende fout."
    },
    nav: {
      cooking: "Koken",
      shopping: "Boodschappen",
      brainstorm: "Brainstormen",
      settings: "Instellingen",
      main: "Hoofdnavigatie"
    },
    splash: {
      tapToStart: "Tik om te beginnen",
      tapToContinue: "Tik om verder te gaan",
      signIn: "Inloggen met Google",
      configMissing: "De Google Client ID ontbreekt. Vul deze in config.js in en herlaad de pagina. Zie README.md voor de instellingen.",
      driveNote: "Je recepten worden bewaard in je eigen Google Drive.",
      signingIn: "Bezig met inloggen…",
      loadingRecipes: "Recepten laden…",
      gisUnavailable: "Google-inloggen kon niet worden geladen. Controleer je internetverbinding en herlaad de pagina.",
      retry: "Opnieuw proberen"
    },
    language: {
      title: "Kies je taal",
      detected: "Gedetecteerd via je Google-account: {language}.",
      detectedUnknown: "We konden je Google-taal niet lezen. Kies een taal.",
      label: "Taal",
      hint: "De app is beschikbaar in het Nederlands en Engels.",
      continue: "Doorgaan"
    },
    welcome: {
      title: "Welkom bij Pantry",
      text: "Kies waar je wilt beginnen. Je kunt later altijd van tab wisselen.",
      skipTutorial: "Rondleiding overslaan",
      cookingTitle: "Koken",
      cookingText: "Bekijk, zoek en voeg recepten toe.",
      shoppingTitle: "Boodschappen",
      shoppingText: "Maak straks lijsten per recept.",
      brainstormTitle: "Brainstormen",
      brainstormText: "Krijg straks receptideeën."
    },
    tutorial: {
      title: "Zo werkt Pantry",
      step1Title: "Koken",
      step1Text: "Zoek op titel of ingrediënt, filter met categorieën en voeg je eigen recepten toe.",
      step2Title: "Porties",
      step2Text: "Open een recept en pas bovenaan het aantal personen aan. De hoeveelheden worden meteen bijgewerkt.",
      step3Title: "Kookmodus",
      step3Text: "Zet de kookmodus aan voor een stap-voor-stap weergave. Tik of zeg ‘volgende’ om verder te gaan.",
      step4Title: "Bewaard in Drive",
      step4Text: "Je recepten staan in de map Pantry App in je eigen Google Drive. Er is geen server en er zijn geen foto’s.",
      skip: "Overslaan",
      back: "Terug",
      next: "Volgende",
      done: "Aan de slag",
      counter: "{current} van {total}"
    },
    cooking: {
      title: "Koken",
      searchPlaceholder: "Zoek op titel of ingrediënt",
      searchClear: "Zoekopdracht wissen",
      addRecipe: "Recept toevoegen",
      editCategories: "Categorieën bewerken",
      noRecipesTitle: "Nog geen recepten",
      noRecipesText: "Voeg je eerste recept toe en begin met koken.",
      noResultsTitle: "Geen recepten gevonden",
      noResultsText: "Probeer een andere zoekterm of categorie.",
      addFirst: "Eerste recept toevoegen",
      noIngredients: "Geen ingrediënten",
      noSteps: "Geen bereidingswijze",
      categoriesTitle: "Categorieën",
      categoriesHint: "Voeg categorieën toe, hernoem ze of verwijder ze. Een categorie die in gebruik is, kan niet worden verwijderd.",
      newCategoryPlaceholder: "Nieuwe categorie",
      categoryEmpty: "Vul een categorienaam in.",
      categoryDuplicate: "Deze categorie bestaat al.",
      categoryInUse: "Deze categorie wordt gebruikt door {count} recept(en).",
      categoryLast: "Er moet minimaal één categorie blijven.",
      categoryAdded: "Categorie toegevoegd.",
      categoryRenamed: "Categorie hernoemd.",
      categoryDeleted: "Categorie verwijderd.",
      restoreDefaults: "Standaardcategorieën herstellen",
      defaultsRestored: "Standaardcategorieën toegevoegd.",
      defaultsPresent: "De standaardcategorieën staan al in de lijst.",
      subcategoriesTitle: "Subcategorieën",
      addSubcategory: "Subcategorie toevoegen",
      subcategoryPlaceholder: "Nieuwe subcategorie",
      subcategoryAdded: "Subcategorie toegevoegd.",
      subcategoryDuplicate: "Deze subcategorie bestaat al.",
      subcategoryEmpty: "Vul een naam voor de subcategorie in.",
      subcategoryLabel: "Subcategorie",
      noSubcategory: "Geen",
      categoryNameLabel: "Naam",
      renameCategory: "Categorie hernoemen",
      deleteCategory: "Categorie verwijderen",
      deleteCategoryTitle: "Categorie verwijderen?",
      deleteCategoryText: "‘{name}’ wordt verwijderd.",
      clearFilters: "Filters wissen",
      nothingToCook: "Dit recept heeft nog geen ingrediënten of stappen om te tonen.",
      deleteRecipeTitle: "Recept verwijderen?",
      deleteRecipeText: "‘{title}’ wordt definitief verwijderd.",
      recipeDeleted: "Recept verwijderd.",
      recipeSaved: "Recept opgeslagen.",
      recipeUpdated: "Recept bijgewerkt.",
      newRecipe: "Nieuw recept",
      editRecipe: "Recept bewerken",
      titleLabel: "Titel",
      titlePlaceholder: "Bijv. Pastasaus",
      categoryLabel: "Categorie",
      ingredientsLabel: "Ingrediënten",
      ingredientsHint: "Eén ingrediënt per regel. Getallen aan het begin worden geschaald.",
      ingredientsPlaceholder: "2 uien\n1 blik tomaten\nzout naar smaak",
      stepsLabel: "Bereidingswijze",
      stepsHint: "Eén stap per regel.",
      stepsPlaceholder: "Snipper de ui.\nKook de pasta.\nMeng alles.",
      titleRequired: "Vul een titel in.",
      categoryRequired: "Kies een categorie.",
      saveRecipe: "Recept opslaan",
      backToList: "Terug naar recepten",
      ingredientsTitle: "Ingrediënten",
      stepsTitle: "Bereidingswijze",
      servingsLabel: "Porties",
      servingsOne: "1 persoon",
      servingsOther: "{count} personen",
      decreaseServings: "Minder porties",
      increaseServings: "Meer porties",
      cookingMode: "Kookmodus",
      cookingModeHint: "Stap voor stap koken met grote tekst, tikken en spraak.",
      startCooking: "Start met koken",
      ingredientProgress: "Ingrediënt {current} van {total}",
      stepProgress: "Stap {current} van {total}",
      finishTitle: "Klaar!",
      finishText: "Eet smakelijk.",
      previous: "Vorige",
      nextItem: "Volgende",
      startVoice: "Start spraak",
      stopVoice: "Stop spraak",
      listening: "Luistert… zeg ‘volgende’",
      voiceUnsupported: "Spraakherkenning wordt niet ondersteund in deze browser.",
      micDenied: "Microfoontoegang is geweigerd.",
      voiceError: "Spraakherkenning is gestopt.",
      tapHint: "Tik om verder te gaan",
      voiceHint: "Of zeg ‘volgende’",
      exitCooking: "Kookmodus sluiten",
      keepAwake: "Scherm blijft aan",
      scaleNote: "Alleen getallen aan het begin van een ingrediënt worden geschaald.",
      doneCooking: "Klaar"
    },
    shopping: {
      title: "Boodschappen",
      soon: "Binnenkort",
      placeholderTitle: "Boodschappenlijst per recept",
      placeholderText: "Deze functie komt later. Straks zie je hier per recept een boodschappenlijst die automatisch meeschaalt met het aantal porties.",
      step1: "Kies een recept en het aantal porties.",
      step2: "De benodigde hoeveelheden worden samengevoegd.",
      step3: "Vink producten af tijdens het winkelen."
    },
    brainstorm: {
      title: "Brainstormen",
      soon: "Binnenkort",
      placeholderTitle: "Receptideeën op maat",
      placeholderText: "Deze functie komt later. Je beantwoordt straks een paar vragen en krijgt passende receptsuggesties.",
      step1: "Kies een continent, budget en bereidingstijd.",
      step2: "Verfijn naar een land.",
      step3: "Kies: koken met wat je hebt, of opnieuw beginnen.",
      step4: "Bewaar suggesties of stuur ze naar Boodschappen."
    },
    settings: {
      title: "Instellingen",
      account: "Account",
      signedInAs: "Ingelogd als {name}",
      googleAccount: "Google-account",
      language: "Taal",
      languageHint: "De app is beschikbaar in het Nederlands en Engels.",
      tutorial: "Rondleiding",
      tutorialHint: "Bekijk de uitleg opnieuw.",
      showTutorial: "Toon rondleiding",
      manual: "Gebruikershandleiding",
      manualHint: "Lees hoe de app werkt en waar je recepten worden bewaard.",
      openManual: "Open handleiding",
      signOut: "Uitloggen",
      signOutHint: "Je recepten blijven in Google Drive staan.",
      exportTitle: "Recepten exporteren",
      exportHint: "Download alle recepten als ZIP met tekstbestanden.",
      exportDone: "Recepten geëxporteerd.",
      exportEmpty: "Er zijn nog geen recepten om te exporteren.",
      importTitle: "Recepten importeren",
      importHint: "Importeer een ZIP-bestand of tekstbestand met recepten.",
      importDone: "{count} recept(en) geïmporteerd, {skipped} overgeslagen.",
      importNone: "Geen recepten gevonden in dit bestand.",
      importError: "Dit bestand kon niet worden gelezen.",
      notSorted: "Niet gesorteerd",
      copyLabel: "kopie",
      signOutTitle: "Uitloggen?",
      signOutText: "Je wordt uitgelogd op dit apparaat. Je recepten blijven bewaard in Google Drive.",
      signOutUnsavedTitle: "Wijzigingen niet opgeslagen",
      signOutUnsavedText: "Je wijzigingen konden niet worden opgeslagen. Als je nu uitlogt, kunnen ze verloren gaan.",
      signOutAnyway: "Toch uitloggen",
      staySignedIn: "Blijf ingelogd",
      about: "Over Pantry",
      version: "Versie 1.0",
      dataLocation: "Opgeslagen in Google Drive",
      signedOut: "Je bent uitgelogd.",
      languageChanged: "Taal gewijzigd."
    },
    manual: {
      title: "Gebruikershandleiding",
      introTitle: "Wat is Pantry?",
      introBody: "Pantry is een eenvoudige receptenapp zonder server. Je recepten zijn tekst alleen: titel, categorie, ingrediënten en bereidingswijze. Er zijn geen foto’s.",
      startTitle: "Aanmelden",
      startBody: "Tik op het chefshoedje op het startscherm en meld je aan met Google. De app gebruikt de drive.file-scope. Daarmee mag Pantry alleen bestanden zien en bewerken die de app zelf heeft aangemaakt.",
      dataTitle: "Waar staan je recepten?",
      dataBody: "Je recepten staan in je eigen Google Drive, in de map Pantry App, in het bestand pantry-data.json. Er is geen backend en er worden geen gegevens naar een andere server gestuurd. De app bewaart lokaal een tijdelijke kopie om snel te kunnen laden.",
      recipesTitle: "Recepten beheren",
      recipesBody: "Gebruik de tab Koken om te zoeken op titel of ingrediënt, te filteren met categorieën en recepten toe te voegen. Tik op een recept om het te openen. Daar kun je het ook bewerken of verwijderen.",
      servingsTitle: "Porties",
      servingsBody: "Elk recept begint bij 2 personen. Met de plus- en minknoppen pas je het aantal porties aan. Getallen aan het begin van een ingrediënt worden direct geschaald. Hoeveelheden in de bereidingswijze worden niet aangepast.",
      cookingTitle: "Kookmodus",
      cookingBody: "Zet de kookmodus aan en tik op Start met koken. Je gaat stap voor stap door de ingrediënten en daarna door de bereidingswijze. Tik op het scherm om verder te gaan. Met de microfoonknop kun je spraak gebruiken; die start alleen als je erop tikt. Zeg ‘volgende’ om verder te gaan.",
      voiceTitle: "Spraak en scherm aan",
      voiceBody: "Spraakherkenning gebruikt de Web Speech API en werkt in de meeste Chromium-browsers en Safari, niet in Firefox. Zolang een recept open is, probeert Pantry het scherm aan te houden met de Wake Lock API. Als je browser dat niet ondersteunt, werkt de app gewoon zonder.",
      languageTitle: "Taal",
      languageBody: "Pantry is beschikbaar in het Nederlands en Engels. Bij de eerste keer inloggen wordt je Google-taal voorgesteld. Je kunt de taal later wijzigen bij Instellingen. Receptteksten worden niet automatisch vertaald.",
      shoppingTitle: "Boodschappen en Brainstormen",
      shoppingBody: "Deze tabs zijn nog placeholders. Later komt er een boodschappenlijst per recept en een brainstormfunctie die receptideeën voorstelt.",
      privacyTitle: "Privacy en uitloggen",
      privacyBody: "Pantry gebruikt geen analytics en plaatst geen advertenties. Als je uitlogt, wordt de toegang tot je Drive ingetrokken en wordt de lokale kopie verwijderd. Je recepten blijven in Google Drive staan.",
      version: "Pantry 1.0 — statische receptenapp"
    },
    errors: {
      authUnavailable: "Google-inloggen is niet beschikbaar. Controleer je internetverbinding en herlaad de pagina.",
      authFailed: "Inloggen is niet gelukt.",
      authDenied: "Inloggen is geannuleerd.",
      popupClosed: "Het inlogvenster is gesloten.",
      driveLoad: "Je recepten konden niet worden geladen.",
      driveSave: "Je wijzigingen konden niet worden opgeslagen.",
      drivePermission: "Pantry heeft geen toegang tot de opslag in Google Drive.",
      noCache: "Er is geen lokale kopie beschikbaar.",
      sessionExpired: "Je sessie is verlopen. Log opnieuw in om verder te gaan.",
      recipeNotFound: "Recept niet gevonden.",
      config: "De configuratie ontbreekt. Vul je Google Client ID in config.js in.",
      storageCorrupt: "De gegevens in Google Drive zijn niet leesbaar.",
      micUnsupported: "Spraakherkenning wordt niet ondersteund in deze browser.",
      speech: "Spraakherkenning is gestopt.",
      noData: "Er zijn geen gegevens beschikbaar."
    }
  },

  en: {
    common: {
      back: "Back",
      close: "Close",
      cancel: "Cancel",
      save: "Save",
      saving: "Saving…",
      add: "Add",
      edit: "Edit",
      delete: "Delete",
      rename: "Rename",
      continue: "Continue",
      skip: "Skip",
      next: "Next",
      done: "Done",
      retry: "Try again",
      confirm: "Confirm",
      loading: "Loading…",
      all: "All",
      search: "Search",
      clear: "Clear",
      error: "Something went wrong.",
      offline: "You are offline. Showing the last saved data.",
      savedLocally: "Saved locally. We’ll try again later.",
      sessionExpired: "Your session has expired.",
      reauthenticate: "Sign in again",
      signOut: "Sign out",
      unsupported: "Not supported in this browser.",
      unknownError: "Unknown error."
    },
    nav: {
      cooking: "Cooking",
      shopping: "Shopping",
      brainstorm: "Brainstorm",
      settings: "Settings",
      main: "Main navigation"
    },
    splash: {
      tapToStart: "Tap to start",
      tapToContinue: "Tap to continue",
      signIn: "Sign in with Google",
      configMissing: "The Google Client ID is missing. Add it to config.js and reload the page. See README.md for setup.",
      driveNote: "Your recipes are stored in your own Google Drive.",
      signingIn: "Signing in…",
      loadingRecipes: "Loading recipes…",
      gisUnavailable: "Google sign-in could not be loaded. Check your internet connection and reload the page.",
      retry: "Try again"
    },
    language: {
      title: "Choose your language",
      detected: "Detected from your Google account: {language}.",
      detectedUnknown: "We couldn’t read your Google language. Choose a language.",
      label: "Language",
      hint: "The app is available in Dutch and English.",
      continue: "Continue"
    },
    welcome: {
      title: "Welcome to Pantry",
      text: "Choose where to start. You can switch tabs at any time.",
      skipTutorial: "Skip the tutorial",
      cookingTitle: "Cooking",
      cookingText: "Browse, search, and add recipes.",
      shoppingTitle: "Shopping",
      shoppingText: "Soon: lists for each recipe.",
      brainstormTitle: "Brainstorm",
      brainstormText: "Soon: recipe ideas."
    },
    tutorial: {
      title: "How Pantry works",
      step1Title: "Cooking",
      step1Text: "Search by title or ingredient, filter by category, and add your own recipes.",
      step2Title: "Servings",
      step2Text: "Open a recipe and adjust the serving count at the top. Ingredient amounts update instantly.",
      step3Title: "Cooking mode",
      step3Text: "Turn on cooking mode for a step-by-step view. Tap or say ‘next’ to continue.",
      step4Title: "Stored in Drive",
      step4Text: "Your recipes live in the Pantry App folder in your own Google Drive. There is no server and no photos.",
      skip: "Skip",
      back: "Back",
      next: "Next",
      done: "Get started",
      counter: "{current} of {total}"
    },
    cooking: {
      title: "Cooking",
      searchPlaceholder: "Search by title or ingredient",
      searchClear: "Clear search",
      addRecipe: "Add recipe",
      editCategories: "Edit categories",
      noRecipesTitle: "No recipes yet",
      noRecipesText: "Add your first recipe and start cooking.",
      noResultsTitle: "No recipes found",
      noResultsText: "Try another search term or category.",
      addFirst: "Add your first recipe",
      noIngredients: "No ingredients",
      noSteps: "No steps",
      categoriesTitle: "Categories",
      categoriesHint: "Add, rename, or remove categories. A category in use cannot be removed.",
      newCategoryPlaceholder: "New category",
      categoryEmpty: "Enter a category name.",
      categoryDuplicate: "This category already exists.",
      categoryInUse: "This category is used by {count} recipe(s).",
      categoryLast: "At least one category must remain.",
      categoryAdded: "Category added.",
      categoryRenamed: "Category renamed.",
      categoryDeleted: "Category removed.",
      restoreDefaults: "Restore default categories",
      defaultsRestored: "Default categories added.",
      defaultsPresent: "The default categories are already in the list.",
      subcategoriesTitle: "Subcategories",
      addSubcategory: "Add subcategory",
      subcategoryPlaceholder: "New subcategory",
      subcategoryAdded: "Subcategory added.",
      subcategoryDuplicate: "This subcategory already exists.",
      subcategoryEmpty: "Enter a subcategory name.",
      subcategoryLabel: "Subcategory",
      noSubcategory: "None",
      categoryNameLabel: "Name",
      renameCategory: "Rename category",
      deleteCategory: "Delete category",
      deleteCategoryTitle: "Delete category?",
      deleteCategoryText: "‘{name}’ will be removed.",
      clearFilters: "Clear filters",
      nothingToCook: "This recipe has no ingredients or steps to show yet.",
      deleteRecipeTitle: "Delete recipe?",
      deleteRecipeText: "‘{title}’ will be permanently deleted.",
      recipeDeleted: "Recipe deleted.",
      recipeSaved: "Recipe saved.",
      recipeUpdated: "Recipe updated.",
      newRecipe: "New recipe",
      editRecipe: "Edit recipe",
      titleLabel: "Title",
      titlePlaceholder: "e.g. Pasta sauce",
      categoryLabel: "Category",
      ingredientsLabel: "Ingredients",
      ingredientsHint: "One ingredient per line. Numbers at the start are scaled.",
      ingredientsPlaceholder: "2 onions\n1 can of tomatoes\nsalt to taste",
      stepsLabel: "Steps",
      stepsHint: "One step per line.",
      stepsPlaceholder: "Chop the onion.\nCook the pasta.\nMix everything.",
      titleRequired: "Enter a title.",
      categoryRequired: "Choose a category.",
      saveRecipe: "Save recipe",
      backToList: "Back to recipes",
      ingredientsTitle: "Ingredients",
      stepsTitle: "Steps",
      servingsLabel: "Servings",
      servingsOne: "1 serving",
      servingsOther: "{count} servings",
      decreaseServings: "Fewer servings",
      increaseServings: "More servings",
      cookingMode: "Cooking mode",
      cookingModeHint: "Step-by-step cooking with large text, tapping, and voice.",
      startCooking: "Start cooking",
      ingredientProgress: "Ingredient {current} of {total}",
      stepProgress: "Step {current} of {total}",
      finishTitle: "Done!",
      finishText: "Enjoy your meal.",
      previous: "Previous",
      nextItem: "Next",
      startVoice: "Start voice",
      stopVoice: "Stop voice",
      listening: "Listening… say ‘next’",
      voiceUnsupported: "Voice recognition is not supported in this browser.",
      micDenied: "Microphone access was denied.",
      voiceError: "Voice recognition stopped.",
      tapHint: "Tap to continue",
      voiceHint: "Or say ‘next’",
      exitCooking: "Exit cooking mode",
      keepAwake: "Screen stays awake",
      scaleNote: "Only numbers at the start of an ingredient are scaled.",
      doneCooking: "Done"
    },
    shopping: {
      title: "Shopping",
      soon: "Coming soon",
      placeholderTitle: "Shopping list per recipe",
      placeholderText: "This feature is coming later. Soon you’ll see a shopping list for each recipe that updates automatically with the serving count.",
      step1: "Choose a recipe and serving count.",
      step2: "The needed amounts are combined.",
      step3: "Check off items while shopping."
    },
    brainstorm: {
      title: "Brainstorm",
      soon: "Coming soon",
      placeholderTitle: "Recipe ideas for you",
      placeholderText: "This feature is coming later. You’ll answer a few questions and get matching recipe suggestions.",
      step1: "Choose a continent, budget, and cooking time.",
      step2: "Narrow it down to a country.",
      step3: "Choose: cook with what you have, or start fresh.",
      step4: "Save suggestions or send them to Shopping."
    },
    settings: {
      title: "Settings",
      account: "Account",
      signedInAs: "Signed in as {name}",
      googleAccount: "Google account",
      language: "Language",
      languageHint: "The app is available in Dutch and English.",
      tutorial: "Tutorial",
      tutorialHint: "View the walkthrough again.",
      showTutorial: "Show tutorial",
      manual: "User manual",
      manualHint: "Read how the app works and where your recipes are stored.",
      openManual: "Open manual",
      signOut: "Sign out",
      signOutHint: "Your recipes remain in Google Drive.",
      exportTitle: "Export recipes",
      exportHint: "Download all recipes as a ZIP of text files.",
      exportDone: "Recipes exported.",
      exportEmpty: "There are no recipes to export yet.",
      importTitle: "Import recipes",
      importHint: "Import a ZIP file or a text file with recipes.",
      importDone: "{count} recipe(s) imported, {skipped} skipped.",
      importNone: "No recipes found in this file.",
      importError: "This file could not be read.",
      notSorted: "Not sorted",
      copyLabel: "copy",
      signOutTitle: "Sign out?",
      signOutText: "You will be signed out on this device. Your recipes remain in Google Drive.",
      signOutUnsavedTitle: "Changes not saved",
      signOutUnsavedText: "Your changes could not be saved. If you sign out now, they may be lost.",
      signOutAnyway: "Sign out anyway",
      staySignedIn: "Stay signed in",
      about: "About Pantry",
      version: "Version 1.0",
      dataLocation: "Stored in Google Drive",
      signedOut: "You have been signed out.",
      languageChanged: "Language changed."
    },
    manual: {
      title: "User manual",
      introTitle: "What is Pantry?",
      introBody: "Pantry is a simple recipe app without a server. Recipes are text only: title, category, ingredients, and steps. There are no photos.",
      startTitle: "Signing in",
      startBody: "Tap the chef’s hat on the splash screen and sign in with Google. The app uses the drive.file scope. This lets Pantry access only files it has created itself.",
      dataTitle: "Where are your recipes?",
      dataBody: "Your recipes are stored in your own Google Drive, in the Pantry App folder, in the file pantry-data.json. There is no backend and no data is sent to any other server. The app keeps a temporary local copy for fast loading.",
      recipesTitle: "Managing recipes",
      recipesBody: "Use the Cooking tab to search by title or ingredient, filter by category, and add recipes. Tap a recipe to open it. There you can also edit or delete it.",
      servingsTitle: "Servings",
      servingsBody: "Every recipe starts at 2 servings. Use the plus and minus buttons to change the serving count. Numbers at the start of an ingredient are scaled instantly. Amounts in the steps are not changed.",
      cookingTitle: "Cooking mode",
      cookingBody: "Turn on cooking mode and tap Start cooking. You go through the ingredients and then the steps one at a time. Tap the screen to continue. Use the microphone button to start voice control; it only starts when you tap it. Say ‘next’ to continue.",
      voiceTitle: "Voice and wake lock",
      voiceBody: "Voice recognition uses the Web Speech API and works in most Chromium browsers and Safari, not in Firefox. While a recipe is open, Pantry tries to keep the screen awake with the Wake Lock API. If your browser does not support it, the app still works without it.",
      languageTitle: "Language",
      languageBody: "Pantry is available in Dutch and English. On first sign-in, your Google language is suggested. You can change the language later in Settings. Recipe text is not translated automatically.",
      shoppingTitle: "Shopping and Brainstorm",
      shoppingBody: "These tabs are still placeholders. Later there will be a shopping list per recipe and a brainstorming feature that suggests recipe ideas.",
      privacyTitle: "Privacy and signing out",
      privacyBody: "Pantry uses no analytics and shows no ads. When you sign out, access to your Drive is revoked and the local copy is removed. Your recipes remain in Google Drive.",
      version: "Pantry 1.0 — static recipe app"
    },
    errors: {
      authUnavailable: "Google sign-in is unavailable. Check your internet connection and reload the page.",
      authFailed: "Sign-in failed.",
      authDenied: "Sign-in was cancelled.",
      popupClosed: "The sign-in window was closed.",
      driveLoad: "Your recipes could not be loaded.",
      driveSave: "Your changes could not be saved.",
      drivePermission: "Pantry does not have access to storage in Google Drive.",
      noCache: "No local copy is available.",
      sessionExpired: "Your session has expired. Sign in again to continue.",
      recipeNotFound: "Recipe not found.",
      config: "Configuration is missing. Add your Google Client ID to config.js.",
      storageCorrupt: "The data in Google Drive could not be read.",
      micUnsupported: "Voice recognition is not supported in this browser.",
      speech: "Voice recognition stopped.",
      noData: "No data is available."
    }
  }
};

/* -------------------------------------------------------------------------
 * Static content structures
 * ---------------------------------------------------------------------- */

export const TUTORIAL_STEPS = [
  { icon: "pot", title: "tutorial.step1Title", text: "tutorial.step1Text" },
  { icon: "user", title: "tutorial.step2Title", text: "tutorial.step2Text" },
  { icon: "play", title: "tutorial.step3Title", text: "tutorial.step3Text" },
  { icon: "hat", title: "tutorial.step4Title", text: "tutorial.step4Text" }
];

export const MANUAL_SECTIONS = [
  { title: "manual.introTitle", body: "manual.introBody" },
  { title: "manual.startTitle", body: "manual.startBody" },
  { title: "manual.dataTitle", body: "manual.dataBody" },
  { title: "manual.recipesTitle", body: "manual.recipesBody" },
  { title: "manual.servingsTitle", body: "manual.servingsBody" },
  { title: "manual.cookingTitle", body: "manual.cookingBody" },
  { title: "manual.voiceTitle", body: "manual.voiceBody" },
  { title: "manual.languageTitle", body: "manual.languageBody" },
  { title: "manual.shoppingTitle", body: "manual.shoppingBody" },
  { title: "manual.privacyTitle", body: "manual.privacyBody" }
];

/* -------------------------------------------------------------------------
 * Language helpers
 * ---------------------------------------------------------------------- */

let current = "en";

export function normalizeLanguage(code) {
  const raw = String(code || "").toLowerCase();
  return raw.startsWith("nl") ? "nl" : "en";
}

export function isSupportedLocale(locale) {
  const raw = String(locale || "").toLowerCase();
  return raw.startsWith("nl") || raw.startsWith("en");
}

export function detectLanguage(googleLocale, fallback = "en") {
  const raw = String(googleLocale || "").toLowerCase();
  if (raw.startsWith("nl")) return "nl";
  if (raw.startsWith("en")) return "en";
  return normalizeLanguage(fallback);
}

export function setLanguage(code) {
  current = normalizeLanguage(code);
  if (typeof document !== "undefined") {
    document.documentElement.lang = current;
  }
}

export function getLanguage() {
  return current;
}

export function getLanguageMeta(code = current) {
  const normalized = normalizeLanguage(code);
  return LANGUAGES.find((item) => item.code === normalized) || LANGUAGES[1];
}

export function languageLabel(code, uiLanguage = current) {
  const normalized = normalizeLanguage(code);
  return LANGUAGE_LABELS[normalizeLanguage(uiLanguage)]?.[normalized]
    || getLanguageMeta(normalized).nativeName;
}

function getByPath(object, path) {
  return String(path || "")
    .split(".")
    .reduce((value, part) => (value && typeof value === "object" ? value[part] : undefined), object);
}

export function t(key, variables = {}) {
  const value = getByPath(STRINGS[current], key) ?? getByPath(STRINGS.en, key);
  if (typeof value !== "string") return key;
  return value.replace(/\{(\w+)\}/g, (_, name) => (
    variables[name] !== undefined ? String(variables[name]) : `{${name}}`
  ));
}

export function formatNumber(value) {
  const meta = getLanguageMeta();
  try {
    return new Intl.NumberFormat(meta.locale, { maximumFractionDigits: 2 }).format(value);
  } catch {
    return String(value);
  }
}

export function formatDate(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  const meta = getLanguageMeta();
  try {
    return new Intl.DateTimeFormat(meta.locale, {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

export function servingsLabel(count) {
  const amount = Math.max(1, Number(count) || 1);
  return amount === 1 ? t("cooking.servingsOne") : t("cooking.servingsOther", { count: amount });
}

export function defaultCategories(language = current) {
  return [...(DEFAULT_CATEGORIES[normalizeLanguage(language)] || DEFAULT_CATEGORIES.en)];
}

export function isDefaultCategorySet(categories) {
  if (!Array.isArray(categories)) return false;
  return Object.values(DEFAULT_CATEGORIES).some((defaults) => (
    defaults.length === categories.length
    && defaults.every((value, index) => value === categories[index])
  ));
}

export function getTutorial() {
  return TUTORIAL_STEPS;
}

export function getManual() {
  return MANUAL_SECTIONS;
}

export function getVoiceCommands(language = current) {
  return VOICE_COMMANDS[normalizeLanguage(language)] || VOICE_COMMANDS.en;
}
