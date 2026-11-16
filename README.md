# Pantry Live

Pantry Live is a static recipe app with optional Google Drive sync. It has no build step and no dependencies. The only server-side code in this repo is a small Cloudflare Worker that relays built-in AI requests to Google. The rest of the app runs in the browser.

The interface is available in **Dutch, English, and German**. On first start, Pantry detects the browser language, suggests it, and asks the user to confirm. The language can be changed later in Settings. Recipe text is never translated automatically.

## Features

- Local mode with recipes stored in the browser.
- Optional Google sign-in with Drive storage.
- Guest recipes, categories, and subcategories are merged into Drive the first time you sign in.
- Profile screen for account status, sign-in, and sign-out.
- Recipe list with search by title or ingredient and category filters.
- Add, edit, and delete recipes.
- Category and subcategory management.
- Import and export of recipes as text files or ZIP archives.
- Serving scaler: every recipe starts at 2 servings and leading ingredient quantities scale live.
- Full-screen cooking mode with tap, keyboard, and optional voice navigation.
- Screen Wake Lock while a recipe is open (when supported).
- Automatic light and dark theme.
- Brainstorm: answer a few questions and either let a Google API key generate a recipe or copy a prompt into the AI chat of your choice and paste the reply back.
- Brainstorm with built-in AI: sign in with Google and the request goes through the Pantry Worker to Gemini. Each tester is limited to 3 requests per day.
- Shopping tab: a translated placeholder for now.

## Requirements

- A modern browser with ES module support: current Chrome, Edge, Safari, or Firefox.
- The app served over HTTP(S). Opening `index.html` directly from disk will not work because ES modules require an origin.
- Optional: a Google OAuth Client ID for Drive sign-in.
- Optional: a Google API key for direct recipe generation in Brainstorm.
- Optional: built-in AI in Brainstorm, which needs the Pantry Worker deployed and your Google account on its tester list.

Without a Google Client ID, local mode still works. Drive sign-in shows a configuration message, and Brainstorm can still use the copy-prompt flow.

## Run locally

From this folder:

```sh
python3 -m http.server 8002
```

Open <http://localhost:8002>.

## Configuration

Edit `js/config.js` in the repository root:

```js
window.PANTRY_CONFIG = {
  googleClientId: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
  driveFolderName: "Pantry App",
  driveFileName: "pantry-data.json"
};
```

The OAuth client must be a **Web application** client. Add the Pages origin and `http://localhost:8002` as authorized JavaScript origins. See the comments in `config.js` for the exact setup.

The app requests these scopes:

- `openid profile` to read the account name and locale.
- `drive.file` to create and update only files this app created.

There is no refresh token. The only backend is the optional built-in AI Worker. A session lasts about an hour; the app asks the user to re-authenticate when it expires.

## Deploy to GitHub Pages

1. Create a standalone repository for this folder.
2. Commit and push the files, including `.nojekyll`.
3. In the repository, open **Settings → Pages**.
4. Deploy from the `main` branch and the repository root.
5. Add the Pages URL to the OAuth client's authorized JavaScript origins.
6. If built-in AI should work on that URL, also add it to ALLOWED_ORIGINS in worker/src/index.js and redeploy the Worker.
7. Open the Pages URL.

No build or CI step is needed.

## How data is stored

Pantry has two modes.

- **Local mode:** recipes, categories, and settings are stored in `localStorage` under `pantry.guest.v1`. This works without an account.
- **Drive mode:** after signing in, the same data is stored in `pantry-data.json` in the `Pantry App` folder in Google Drive. A local cache under `pantry.cache.v1.<account>` speeds up loading and supports offline use.

Signing in merges local recipes into Drive. Existing Drive recipes are kept. Recipes are deduplicated by id and then by normalized title; categories and subcategories are merged case-insensitively. The local copy is cleared only after the merged data has been saved successfully. Signing out returns to local mode without deleting the Drive file.

The Google session token is kept in `sessionStorage` under `pantry.session.v1`. The optional Brainstorm API key is kept separately in `localStorage` and is never included in recipe exports.

### Data shape

```json
{
  "version": 1.0,
  "recipes": [
    {
      "id": "uuid",
      "title": "Pasta sauce",
      "category": "Dinner",
      "subcategory": "Pasta",
      "ingredients": "2 onions\n1 can of tomatoes",
      "steps": "Chop the onion.\nSimmer everything.",
      "baseServings": 2,
      "createdAt": "2026-01-01T12:00:00.000Z",
      "updatedAt": "2026-01-01T12:00:00.000Z"
    }
  ],
  "categories": ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Drinks"],
  "subcategories": { "Dinner": ["Pasta"] },
  "settings": {
    "language": "en",
    "languageConfirmed": true,
    "welcomeSeen": true,
    "tutorialSeen": true
  },
  "updatedAt": "2026-01-01T12:00:00.000Z"
}
```

Recipes are text only: title, category, subcategory, ingredients, and steps. There are no photos.

## How the app works

- **Start:** tapping the splash screen opens local mode or an existing unexpired session. It never forces a Google login.
- **Profile:** the chef-hat button opens Profile. In local mode it explains local storage and offers Google sign-in. In Drive mode it shows the account and a sign-out button.
- **Saving:** local changes are written immediately to `localStorage`. Drive changes are saved with a short debounce and retried when the browser comes online.
- **Merging:** when a local user signs in, local recipes are added to the Drive collection without overwriting existing Drive recipes. Local categories and subcategories are unioned case-insensitively.
- **Servings:** `baseServings` is always 2. The ingredient scaler changes a quantity only when it appears at the start of an ingredient line. It supports whole numbers, decimals, fractions, mixed fractions, unicode fractions, and simple ranges.
- **Cooking mode:** Shows ingredients first, then steps. Tap the stage or use the Next button. Arrow keys work too. Voice recognition starts only when the microphone button is tapped. English commands: “next”, “continue”, “forward”, “done”. Dutch commands: “volgende”, “verder”, “ga door”, “klaar”.
- **Brainstorm without a key:** answer the questions, copy the generated prompt into the AI chat of your choice, paste the reply back, review the preview, and save it.
- **Brainstorm with a key:** add a Google API key from Brainstorm. The app then asks Google for a 2-serving recipe directly and shows the result before saving. Manage or disconnect the key at any time in Settings.
- **Language:** Dutch, English, and German strings live in `js/i18n.js`. Default categories swap with the interface language if they have not been customised.

## Plain-text recipe format

Pasted replies use the same layout as import and export:

```text
Title: ...
Category: ...
Subcategory: ...
Tags:

Ingredients:
...

Steps:
...
```

One ingredient or step per line. A recipe without a title cannot be saved.

## File overview
.
├── .gitignore
├── .nojekyll
├── CNAME                      # custom domain for GitHub Pages (pantrycooking.app)
├── README.md
├── config.js                  # Google OAuth Client ID and Drive file settings (loaded by index.html)
├── index.html                 # static shell, splash screen, icon sprite
├── css/
│   └── styles.css             # design tokens, themes, layout, components
├── icons/
│   ├── pantry-icon-120.png    # Google Cloud OAuth logo
│   ├── pantry-icon-180.png    # iPhone home screen (apple-touch-icon)
│   ├── pantry-icon-192.png    # Android and web app manifest
│   ├── pantry-icon-512.png    # Android and web app manifest (large)
│   └── pantry-icon.svg        # master icon, edit this and re-export the PNGs
├── js/
│   ├── app.js                 # bootstrap, splash, navigation, shared chrome
│   ├── ai-auth.js             # Google sign-in for built-in AI (ID token kept in memory only)
│   ├── auth.js                # Google Identity Services token flow for Drive
│   ├── brainstorm-api.js      # Google API key and built-in AI recipe requests
│   ├── brainstorm-prompt.js   # builds the copy-prompt text for AI chats
│   ├── drive.js               # Google Drive file storage
│   ├── exchange.js            # recipe text format and export
│   ├── i18n.js                # Dutch, English, and German strings and language helpers
│   ├── importer.js            # import of recipe text files and ZIP archives
│   ├── keywords.js            # keywords for sorting imported recipes
│   ├── manual.js              # shared user manual modal
│   ├── onboarding.js          # language confirmation, welcome, tutorial
│   ├── recipe.js              # ingredient scaling and search helpers
│   ├── speech.js              # Web Speech API wrapper
│   ├── store.js               # local/Drive state, merging, and persistence
│   ├── ui.js                  # modal, toast, icons, escaping helpers
│   ├── unzip.js               # minimal ZIP reader
│   ├── wakelock.js            # Screen Wake Lock helper
│   ├── zip.js                 # minimal ZIP writer
│   └── views/
│       ├── brainstorm.js      # questions, direct generation, prompt copy, paste, preview
│       ├── cooking.js         # recipe list, detail, form, categories, cooking mode
│       ├── profile.js         # local mode, sign-in, sign-out
│       ├── settings.js        # export, import, language, manual, Brainstorm connection
│       └── shopping.js        # placeholder
└── worker/
    ├── wrangler.toml          # Cloudflare Worker configuration
    └── src/
        └── index.js           # built-in AI relay: checks sign-in and tester list, daily limit, forwards to Gemini
```

## Privacy and security

- No analytics, ads, or tracking by Pantry.
- Local mode keeps recipes, categories, and settings in the browser.
- Drive mode stores the same data in a file the app owns in the user's Google Drive.
- The OAuth token is kept in `sessionStorage`.
- The app can only access Drive files it created with the `drive.file` scope.
- Brainstorm sends data to Google only when the user makes uses of the built in AI-feature. The copy-prompt flow does not call Google from Pantry; an external AI chat handles that request under its own terms (picked by the user).
- Built-in AI sends the sign-in token and your Brainstorm prompt to the Pantry Worker. The Worker checks the tester list, counts daily requests per account email, and forwards the prompt to Google. Recipes are not sent.

## Limitations

- Shopping is a placeholder; it is not implemented yet.
- Brainstorm recipes come from Google or the AI chat you use. Check ingredients and steps before cooking.
- No recipe images, sharing, or multi-user collaboration.
- No automatic language translation of recipe content.
- Local data is tied to the browser and device. Clearing browser storage removes it.
- Drive sync is last-write-wins per file; there is no real-time collaboration.
- Voice and Wake Lock depend on browser support.
- Bulk selection for delete, export, and edit is future work.

## Troubleshooting

- **Sign-in does nothing:** check that the OAuth Client ID is set, the current origin is authorized, and third-party cookies or storage are not blocked.
- **Recipes missing after sign-in:** existing Drive data wins. Local recipes are added, but a Drive recipe with the same title is kept.
- **Changes not saving to Drive:** the app keeps a local cache and retries. Check the connection and the session.
- **Brainstorm save does nothing:** the pasted reply must include a `Title:` line and the `Ingredients:` and `Steps:` sections. Check the preview before saving.
- **Brainstorm API key fails:** check the key in Settings, or continue with the copy-prompt flow.
- **No microphone:** voice recognition is not supported in this browser or microphone access was denied.
- **Screen turns off:** Wake Lock is not supported in this browser, or the page is not visible.
