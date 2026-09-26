# Luka Wallet

A local-first personal finance app for everyday use on an iPhone. It is a Progressive Web App: open the URL in Safari, tap Share, then "Add to Home Screen". There is no App Store, no account and no server. Every record lives in the browser's IndexedDB on the device.

The interface is in Spanish and amounts are in Colombian pesos (COP).

## Features

- Income and expense entries with amount, category, date, payment method and an optional note.
- Built-in and custom categories, split by type.
- Monthly budgets per category with progress and warnings near or over the limit.
- Home view with the month's balance, income vs. expenses, spending by category and recent entries.
- History with month, category and type filters plus search.
- Password-encrypted backup export and import, and plain CSV export.
- Works fully offline once installed.

## Privacy and security

- **No data leaves the device.** No analytics, no CDNs, no third-party requests. Fonts are bundled with the app.
- **Strict Content Security Policy.** The production build ships a `<meta http-equiv="Content-Security-Policy">` starting from `default-src 'self'`, with no inline scripts or styles and no `data:` fonts (`build.assetsInlineLimit` is `0`).
- **Encrypted backups.** Backups use the Web Crypto API only:
  - PBKDF2-SHA256 with 600,000 iterations (the current OWASP recommendation) derives a 256-bit AES-GCM key.
  - A new random 16-byte salt and 12-byte IV are generated for every export.
  - The file stores the format version, KDF parameters, salt, IV and ciphertext. The password is never stored.
  - The format header is bound to the ciphertext as AES-GCM additional authenticated data, so tampering with the parameters or the ciphertext makes decryption fail.
  - Imports validate the format, version and every record before asking for confirmation to replace current data.
- **CSV is not encrypted.** The app warns about this before exporting. Text cells that start with `=`, `+`, `-` or `@` are prefixed with `'` to prevent formula injection in spreadsheet apps.
- **Storage durability.** The app requests persistent storage on the first save. Data still exists only on the phone and is lost if the app is removed, so the app reminds you to export a backup when more than two weeks have passed without one.

## Data model

- Amounts are integers in pesos, never floating point.
- Dates are stored as local `YYYY-MM-DD` strings and parsed as local dates, so entries never shift to the previous day in Bogotá (UTC−5).
- The IndexedDB schema is versioned with Dexie (`transactions`, `categories`, `budgets`, `settings`) so data on the phone survives model changes.

## Stack

- React, Vite and TypeScript
- `vite-plugin-pwa` (Workbox) with an update prompt instead of silent reloads
- Dexie and `dexie-react-hooks`
- Vitest
- GitHub Pages, deployed with GitHub Actions

## Development

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

`npm run dev -- --host` exposes the dev server on the local network to review the layout on a phone. Service workers require HTTPS, so installation and offline mode are tested on the deployed URL.

## Deployment

Pushing to `main` runs lint, tests and the build, then publishes `dist/` to GitHub Pages. The app is served under `/finance-pwa/`, and `index.html` is copied to `404.html` so deep links load the app.
