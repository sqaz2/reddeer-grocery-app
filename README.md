# Red Deer Grocery Deals Platform

This repository now includes the first live-coded components for the Red Deer grocery deals platform:

- `api/` — TypeScript Express API that serves the canonical store catalogue derived from Google Places.
- `web/` — Mobile-first Vite + React progressive web app that consumes the API, with keyboard-aware layout tuned for handheld devices.
- `data/` — Persisted datasets generated from live integrations (no mock data).

## Prerequisites

- Node.js 18+
- Google Maps Places API key with Places API enabled

## Getting Started

1. **Synchronise the store catalogue**

   ```bash
   cd api
   cp .env.example .env
   # edit .env and add GOOGLE_MAPS_API_KEY
   npm install
   npm run sync-stores
   ```

   The job queries Google Places for grocery-capable retailers across Red Deer, Blackfalds, Lacombe, Penhold, Innisfail, Bowden, Springbrook, and Sylvan Lake, then writes `../data/stores.json`.

2. **Launch the API**

   ```bash
   npm run dev
   ```

   The server exposes:

   - `GET /health`
   - `GET /stores`
   - `GET /stores/:placeId`

3. **Run the web client**

   ```bash
   cd ../web
   cp .env.example .env
   npm install
   npm run dev
   ```

   The React app will load the live catalogue, providing filtering, map deep links, and a keyboard-safe mobile layout that reserves 50% of the viewport when text inputs are focused.

## Next Steps

- Extend the API with Firestore persistence and ingestion of Reddit, Facebook, and delivery catalogues.
- Layer in authentication, personalised planning, and community deal submissions per the implementation blueprint.
- Containerise services and wire CI/CD pipelines for production deployments.
