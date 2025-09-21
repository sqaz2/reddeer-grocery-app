# Data Directory

This folder stores synchronised datasets generated from live integrations. To populate the store catalogue, run:

```bash
cd api
cp .env.example .env # add your Google Maps API key
npm install
npm run sync-stores
```

The job will create `stores.json` with verified Google Places entries for Red Deer and surrounding communities. The API and web app read directly from this file at runtime, ensuring no placeholder data is ever displayed.
