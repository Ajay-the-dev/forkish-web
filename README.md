# POS frontend (Vue 3 + Pinia + Router + Vite + Bootstrap 5)

    npm install
    npm run dev        # runs with in-memory demo data (VITE_MOCK=true)

Set `VITE_MOCK=false` in `.env` to call the Laravel API (proxied to :8000).
Set `VITE_CURRENCY`, `VITE_LOCALE`, `VITE_TAX_RATE` and `VITE_TAX_LABEL` in `.env` for the target country (keep them in sync with `backend/.env`).
Backend still needs GET /api/menu ({categories, items}) and GET /api/tables ({id,name,zone,status}).
