# Pocket Budget

A mobile-first, offline-capable personal budgeting PWA. It uses plain HTML, CSS and JavaScript and stores your finance records in the browser on your device.

## Features

- Track income from multiple sources and everyday expenses
- Monthly overview and overall spending limits
- Category-level monthly budgets
- Food subcategories: Meal, Online order, and Snacks
- Category spending breakdown
- 80% approaching-limit and 100% over-budget warnings; transactions are never blocked
- Savings goals
- Search, edit and delete transactions
- JSON backup/restore and CSV transaction export
- Installable PWA with service-worker caching
- No account, analytics, external libraries, or server-side financial data

## Run locally

A service worker requires HTTPS or localhost. Opening `index.html` directly with `file://` may show the UI, but offline installation and service-worker features will not work correctly.

### Option A: VS Code Live Server
1. Open this folder in VS Code.
2. Install the **Live Server** extension if needed.
3. Right-click `index.html` and choose **Open with Live Server**.
4. Visit the localhost URL it opens.

### Option B: Python local server
If Python is installed, open a terminal in this folder and run:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish free with GitHub Pages

1. Create a GitHub repository named `pocket-budget` (a public repository works with GitHub Free Pages).
2. Upload the contents of this folder to the repository root. `index.html` must be at the root.
3. On GitHub, open **Settings → Pages**.
4. Under the build/deployment section, choose **Deploy from a branch**.
5. Choose branch `main`, folder `/ (root)`, then save.
6. Wait for GitHub Pages to publish the site, then open the URL shown in Pages settings.

The app uses relative file paths so it can work from a project URL such as `https://USERNAME.github.io/pocket-budget/`.

## Install on Android

1. Open the published HTTPS site in Chrome.
2. Visit it while online and allow a moment for the service worker to cache its files.
3. Use Chrome's menu → **Install app** or **Add to Home screen** if offered.
4. Open it once, then test with airplane mode enabled.

Browser menus vary by Android version. A service worker cannot make the first visit offline; load the app once while online first.

## Privacy and data safety

- Transactions, budgets and goals are stored in `localStorage` in the browser origin.
- The app does not send financial data to a server or GitHub.
- GitHub stores the app source code, not the data saved by your browser.
- Local data is specific to the browser/device and website origin. It does not automatically sync between phone and laptop.
- Clearing site data, browser resets, or losing the device can erase records. Export a JSON backup periodically (for example, once a week or at month-end) and before clearing browser data, changing devices, or reinstalling/resetting your browser. Save it outside the app, such as in your phone Files folder or a private cloud drive. The app does not automatically create a second copy.
- Importing a JSON backup replaces current data; export current data first if you need both.
- Do not publish backups to a public repository or share them with others.
- This is a personal-use tool, not audited financial software. Verify important totals and keep backups.

## Update the app

After publishing code changes, the service worker cache version may need updating. Change `CACHE_NAME` in `service-worker.js`, for example from `pocket-budget-v1` to `pocket-budget-v2`, then commit and push. Reopen the site online to receive the update.

## Project files

- `index.html` — page structure and dialogs
- `style.css` — responsive visual design
- `app.js` — app logic and local data handling
- `manifest.json` — PWA installation metadata
- `service-worker.js` — offline shell caching
- `icons/icon.svg` — app icon
