Claude















Readme · MD
# Pantry
 
Pantry is a small, static recipe app for GitHub Pages. It has no backend, no build step, and no dependencies. Recipes are stored as one JSON file in the user's own Google Drive.
 
The interface is available in **Dutch, English, and German**. The first time someone signs in, Pantry detects their Google language, suggests it, and asks them to confirm. The language can be changed later in Settings. Recipe text is never translated automatically.
 
## Features
 
- Google sign-in with Google Identity Services.
- Recipes stored in `Pantry App/pantry-data.json` in the user's Drive.
- Recipe list with search by title or ingredient and category filters.
- Add, edit, and delete recipes.
- Category and subcategory management.
- Import and export of recipes as text files or ZIP archives.
- Serving scaler: every recipe starts at 2 servings and leading ingredient quantities scale live.
- Full-screen cooking mode with tap, keyboard, and optional voice navigation.
- Screen Wake Lock while a recipe is open (when supported).
- Automatic light and dark theme.
- Offline-friendly local cache of the last loaded data.
- Shopping and Brainstorm tabs are translated placeholders for now.
## Requirements
 
- A modern browser with ES module support: current Chrome, Edge, Safari, or Firefox.
- A Google Cloud project with an OAuth 2.0 Web Client ID.
- The app served over HTTP(S). Opening `index.html` directly from disk will not work because ES modules and Google sign-in require an origin.
Voice recognition works in most Chromium browsers and Safari, but not Firefox. Wake Lock support varies by browser. Both features fail gracefully.
 
## Google Cloud setup
 
1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Drive API** for the project.
3. Configure the **OAuth consent screen**:
   - User type: External is fine for personal use.
   - Add your Google account as a test user while the app is in testing mode.
   - The app only needs the scopes requested by the code: `openid`, `profile`, and `https://www.googleapis.com/auth/drive.file`.
4. Create an **OAuth 2.0 Client ID** of type **Web application**.
5. Add the JavaScript origins where the app will run, for example:
   - `http://localhost:8000`
   - `https://YOUR-GITHUB-USERNAME.github.io`
6. Copy the Client ID into `config.js`:
```js
window.PANTRY_CONFIG = {
  googleClientId: "YOUR_CLIENT_ID.apps.googleusercontent.com",
  driveFolderName: "Pantry App",
  driveFileName: "pantry-data.json"
};
```
 
You do **not** need a Client Secret. Never put a Client Secret in this static app. The Client ID is public and safe to commit.
 
## Run locally
 
From this folder:
 
```sh
python3 -m http.server 8000
```
 
Open <http://localhost:8000>. If you use a different port, add that exact origin to the OAuth client's authorized JavaScript origins.
 
## Deploy to GitHub Pages
 
1. Create a standalone repository for this folder (it currently sits inside another Git working tree).
2. Commit and push the files, including `.nojekyll`.
3. In the repository, open **Settings → Pages**.
4. Deploy from the `main` branch and the repository root.
5. Add `https://YOUR-GITHUB-USERNAME.github.io` to the OAuth client's authorized JavaScript origins.
6. Open the Pages URL and sign in.
No build or CI step is needed.
 
Example for a new standalone repository:
 
```sh
git init
git add .
git commit -m "Add Pantry recipe app"
git branch -M main
git remote add origin git@github.com:YOUR-GITHUB-USERNAME/pantry.git
git push -u origin main
```
 
## How data is stored
 
Pantry uses the `drive.file` scope. The app can only see and modify files that it created itself; it does not get access to the rest of Drive.
 
On first sign-in Pantry creates:
 
```text
Google Drive/
└── Pantry App/
    └── pantry-data.json
```
 
The JSON file contains recipes, categories, settings, and an `updatedAt` timestamp. The file is visible in Drive and can be backed up or inspected manually. Google Drive's own version history provides some protection against accidental changes.
 
A local copy is cached in `localStorage` under `pantry.cache.v1.<google-account-id>` so the app can open quickly and keep showing the last data when offline. Signing out removes the local copy; the Drive file remains.
 
### Data shape
 
```json
{
  "version": 1,
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
  "categories": ["Breakfast", "Lunch", "Dinner", "Snack"],
  "subcategories": { "Dinner": ["Pasta", "Curry"] },
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
 
- **Sign-in:** Google Identity Services returns an access token. No refresh token is used. Tokens normally expire after about an hour; when a save fails because the session expired, Pantry asks you to sign in again.
- **Loading:** Pantry reads the Drive file, compares it with the local cache by `updatedAt`, and uses the newest copy. If Drive is unreachable, it falls back to the cache and shows an offline banner.
- **Saving:** Changes are saved with a short debounce. Failed saves are retried on the next change or when the browser comes back online.
- **Servings:** `baseServings` is always 2. The ingredient scaler changes a quantity only when it appears at the start of an ingredient line. It supports whole numbers, decimals, fractions, mixed fractions, unicode fractions, and simple ranges.
- **Cooking mode:** Shows ingredients first, then steps. Tap the stage or use the Next button. Arrow keys work too. Voice recognition starts only when the microphone button is tapped, and the command is “next” / “volgende”.
- **Offline:** The cached data remains readable. Saves are queued locally and retried when possible. The offline banner explains when the app is using the local copy.
- **Language:** Dutch, English, and German strings live in `js/i18n.js`. Default categories swap with the interface language if they have not been customised.
- **Import and export:** Export (Settings) downloads all recipes as a ZIP with one `.txt` file per recipe, saved to the device and not to Drive. Import (Settings) accepts a `.zip` or a single `.txt`. Each file uses this layout: `Title:`, `Category:`, `Subcategory:`, `Tags:`, then `Ingredients:` and `Steps:` with one item per line. A recipe without a title is skipped. A recipe without a category is sorted by the keyword rules in `js/keywords.js`, or placed under "Not sorted". Recipes with an existing title are imported as a copy.
## File overview
 
```text
.
├── .nojekyll
├── README.md
├── config.js              # public Google Client ID and Drive file names
├── index.html             # static shell, splash screen, icon sprite
├── css/
│   └── styles.css         # design tokens, themes, layout, components
└── js/
    ├── app.js             # bootstrap, auth gate, navigation, shared chrome
    ├── auth.js            # Google Identity Services token flow
    ├── drive.js           # Google Drive folder/file read and write
    ├── exchange.js        # recipe text format and export
    ├── i18n.js            # Dutch/English/German strings and language helpers
    ├── importer.js        # import of recipe text files and ZIP archives
    ├── keywords.js        # keywords for sorting imported recipes
    ├── onboarding.js      # language confirmation, welcome, tutorial
    ├── recipe.js          # ingredient scaling and search helpers
    ├── speech.js          # Web Speech API wrapper
    ├── store.js           # state, local cache, debounced Drive saves
    ├── ui.js              # modal, toast, icons, escaping helpers
    ├── unzip.js           # minimal ZIP reader
    ├── wakelock.js        # Screen Wake Lock helper
    ├── zip.js             # minimal ZIP writer
    └── views/
        ├── cooking.js     # recipe list, detail, form, categories, cooking mode
        ├── shopping.js    # placeholder
        ├── brainstorm.js  # placeholder
        └── settings.js    # account, language, manual, tutorial, sign-out
```
 
## Privacy and security
 
- No backend, analytics, ads, or third-party tracking.
- Recipes go only to the user's Google Drive and the Google Identity Services endpoints.
- Only the `drive.file` scope is requested for Drive access.
- The access token is kept in `sessionStorage` for the current browser tab and expires quickly.
- Signing out revokes the token and clears the local cache.
- Never commit a Client Secret. This app only needs a public OAuth Client ID.
## Limitations
 
- Shopping and Brainstorm are placeholders; they are not implemented yet.
- No recipe images, sharing, or multi-user collaboration.
- No automatic language translation of recipe content.
- No refresh token. Re-authentication is required when the access token expires.
- Offline mode can read cached data but cannot save to Drive until the connection returns.
- Voice and Wake Lock depend on browser support.
## Troubleshooting
 
- **“The Google Client ID is missing”**: set `googleClientId` in `config.js` and reload.
- **Sign-in popup closes or is blocked**: allow popups for the site, or check that the exact origin is listed under authorized JavaScript origins.
- **`access_denied`**: add the Google account as a test user on the OAuth consent screen, or publish the app.
- **Google sign-in does not load**: check the network connection and any content blockers; reload the page.
- **Drive permission error**: confirm the Google Drive API is enabled and the account has access to the app-created file. The `drive.file` scope cannot see files created by other apps.
- **Unreadable JSON**: open `Pantry App/pantry-data.json` in Drive and inspect or restore an earlier version. Pantry reports this as corrupt data instead of overwriting it.
- **Changes not saving**: the offline banner appears when Pantry is using the local cache. Reconnect and try again, or sign in again if the session expired.