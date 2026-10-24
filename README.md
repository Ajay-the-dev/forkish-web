# Restaurant POS frontend

The frontend for a restaurant point-of-sale system: a register, a floor plan, a kitchen display, order history, a printed-bill designer, and admin screens for the menu, tables and staff.

Built with Vue 3, Pinia, Vue Router, Vite and Bootstrap 5 (Sass). The backend is a separate Laravel API.

## Getting started

```bash
npm install
npm run dev
```

By default the app runs in **demo mode** with in-memory data, so no backend is needed. Sign in with:

- Email: `admin@pos.local`
- Password: `password`

| Script            | What it does                         |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite dev server            |
| `npm run build`   | Build for production into `dist/`    |
| `npm run preview` | Serve the production build locally   |

## Configuration

Settings are read from `.env` at build time.

| Variable         | Required | Description                                                                  |
| ---------------- | -------- | ---------------------------------------------------------------------------- |
| `VITE_MOCK`      | no       | `false` calls the Laravel API. Any other value (or unset) uses demo data.     |
| `VITE_CURRENCY`  | **yes**  | ISO 4217 currency code, e.g. `USD`, `EUR`, `INR`. The app fails to start without it. |
| `VITE_LOCALE`    | no       | Locale for number and date formatting, e.g. `en-IN`. Defaults to the browser's. |
| `VITE_TAX_RATE`  | no       | Tax as a percentage, e.g. `5` or `7.25`. Defaults to `0`.                     |
| `VITE_TAX_LABEL` | no       | Label shown for tax on screen and on bills, e.g. `GST`. Defaults to `Tax`.    |
| `VITE_REST_NAME` | no       | Restaurant name shown in the header, on the login screen and on bills.        |

Keep `VITE_CURRENCY`, `VITE_TAX_RATE` and `VITE_TAX_LABEL` in sync with the backend's `.env`.

Example:

```ini
VITE_MOCK=true
VITE_CURRENCY=INR
VITE_LOCALE=en-IN
VITE_TAX_RATE=5
VITE_TAX_LABEL=GST
VITE_REST_NAME=My Restaurant
```

## Using the real backend

Set `VITE_MOCK=false` and start the Laravel API on `http://localhost:8000`. In development, Vite proxies every `/api` request there (see [vite.config.js](vite.config.js)).

Requests use cookie-based sessions (`withCredentials`), so the frontend and API must be served from the same site in production. All endpoints the app calls are listed in the `real` object in [src/lib/api.js](src/lib/api.js).

Two behaviours the API is expected to support:

- **Manager approval.** When a user lacks permission for a sensitive action, the API responds `403` (or `429`) with `{ approval_required: ... }`. The app asks a manager for their PIN and retries with `X-Approver-Id` and `X-Approver-Pin` headers.
- **Undo.** Floor actions (pay, split, merge, move, join, table status) return an `undo` token, which the app can send to `POST /api/undo/{token}`.

## Screens

| Route               | Screen           | Permission needed                     |
| ------------------- | ---------------- | ------------------------------------- |
| `/pos`              | Register         | any signed-in user                    |
| `/tables`           | Table picker     | `tables.view`                         |
| `/kitchen`          | Kitchen display  | `kitchen.view`                        |
| `/history`          | Order history    | `reports.view`                        |
| `/bill-editor`      | Bill designer    | `settings.view`                       |
| `/menu/items`       | Menu items       | any of `menu.create/update/cancel`    |
| `/menu/categories`  | Menu categories  | any of `menu.create/update/cancel`    |
| `/floor/plan`       | Floor plan       | any of `tables.create/update/cancel`  |
| `/floor/tables`     | Tables admin     | any of `tables.create/update/cancel`  |
| `/floor/zones`      | Zones            | any of `tables.create/update/cancel`  |
| `/team`             | Team and roles   | `team.view`                           |

Users without permission for a screen are sent back to the register.

## Project structure

```
src/
  main.js          App entry: Vue, Pinia, router, styles
  router.js        Routes and permission guard
  App.vue          App shell and navigation
  views/           One component per screen
  components/      Dialogs, the printable bill, icons, undo toast
  stores/          Pinia stores: auth, pos (orders/menu/tables), bill (bill template)
  lib/             API client (real + demo), money/tax, dates, printing, helpers
  assets/          Sass: design tokens and per-screen partials
```

## Deployment

The site is set up for Netlify ([netlify.toml](netlify.toml)): it runs `npm run build`, publishes `dist/`, and rewrites all paths to `index.html` for client-side routing.

The Vite `/api` proxy only exists in development. For a production build with `VITE_MOCK=false`, `/api` must reach the Laravel backend, for example through a Netlify proxy redirect or by serving both from the same domain.
