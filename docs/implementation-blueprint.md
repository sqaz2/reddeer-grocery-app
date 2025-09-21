# Red Deer Grocery Deals Platform — Implementation Blueprint

## 1. Vision and Non-Negotiable Outcomes
- Deliver a production-ready mobile-first web application that continuously surfaces real grocery deals (including unadvertised clearance) for residents of Red Deer, Alberta and neighbouring towns such as Blackfalds, Penhold, Sylvan Lake, Lacombe, and Innisfail.
- Guarantee there is **zero mock or placeholder content** in any environment by wiring every screen to live ingestion pipelines or persisted historical records originating from the real integrations described below.
- Capture the full universe of grocery-capable retailers (supermarkets, ethnic grocers, wholesale clubs, pharmacies with sizeable food aisles, dollar stores carrying staples) in the trade area by programmatically synchronizing with Google Maps Places data on a recurring schedule.
- Empower budget-conscious households to save measurable money and time through AI-assisted planning, crowdsourced intelligence, and integrated delivery/curbside fulfilment pathways.

## 2. Service Area and Store Coverage Strategy
1. **Canonical Store Catalogue (no manual lists):**
   - Nightly Cloud Function invokes the Google Places *Text Search* API with the query set: `"grocery store"`, `"supermarket"`, `"ethnic grocery"`, `"warehouse club"`, `"pharmacy"`, `"dollar store"`, `"butcher"`, `"bakery"`, `"health food"`, `"bulk food"` within a bounding polygon covering postal codes T4N–T4R, plus 25 km buffers to capture Blackfalds, Lacombe, Innisfail, Penhold, Springbrook, Sylvan Lake, Delburne, and Bowden. Each response is dereferenced via the Places *Details* API to capture place IDs, formatted addresses, opening hours, delivery options, wheelchair access, and Google Maps deep links.
   - Deduplicate by `place_id` and normalise categories using an internal taxonomy (e.g., `SUPERMARKET`, `PHARMACY_GROCERY`, `WAREHOUSE`, `SPECIALTY_ETHNIC`, `DISCOUNT_VARIETY`). Persist to Firestore `stores` collection with a `lastVerifiedAt` timestamp and the original Google payload for traceability.
   - Run quarterly backfill using Google Places *Nearby Search* centred on each municipality to catch stores that might not rank in text search. Flag stale entries (no longer returned or marked permanently closed) for soft deletion.
2. **Coverage Validation:**
   - Automated integration test compares Places results with OpenStreetMap extracts and municipal business licence lists (imported as CSV to Cloud Storage) to detect missing retailers. Any variance triggers an alert for manual review.
   - Store detail pages in the app expose the Google Maps deep link, click-to-call phone number, crowd-sourced notes, AI predictions, Instacart/DoorDash availability, and accessibility indicators.

## 3. Mobile Experience & UX Guardrails
- Build as a responsive Progressive Web App optimised for devices 360–430 px wide.
- Implement viewport-safe layouts that shift actionable buttons and critical deal information above the fold even when the on-screen keyboard covers the bottom **50% of the viewport** (e.g., use CSS `env(safe-area-inset-bottom)` and dynamic view height units, anchor call-to-action bars above a reserved keyboard overlay container).
- Provide offline caching (Service Worker + IndexedDB) for saved plans and downloaded deals so shoppers can consult information inside stores with poor reception.

## 4. High-Level Architecture
- **Frontend (React + TypeScript + Vite or Next.js):**
  - PWA shell with Firebase Authentication, Firestore SDK, and Cloud Messaging integration.
  - Modular components for deal feeds, store directory map/list, personal planner, delivery handoff, and metrics dashboard.
- **Backend & Data Platform:**
  - Firebase Authentication for user accounts (email/password, Google, Apple; optional Facebook if needed for social features).
  - Firestore for transactional data (users, stores, deals, plans, inventory logs, AI outputs). BigQuery used for analytical workloads and model training snapshots via scheduled exports.
  - Cloud Functions (TypeScript) for ingestion jobs, NLP processing, Instacart/DoorDash orchestration, notifications, and scheduled AI scoring.
  - Cloud Run microservice (Node.js) hosting headless Chromium for Facebook group scraping (isolated project, rotates residential proxies if required) and any integration requiring server-side session management.
  - Secrets stored in Google Secret Manager; integration credentials rotated automatically via Secret Manager versions.
- **DevOps:**
  - Replit for collaborative prototyping; GitHub + GitHub Actions for CI (lint, unit tests, type checks, Lighthouse). Deploy to Firebase Hosting (web), Cloud Functions, and Cloud Run via CI pipelines with canary releases.

## 5. Data Acquisition Pipelines
### 5.1 Facebook Community Intelligence
- **Scope:** Public Red Deer-focused bargain groups, community buy/sell groups, relevant store pages (e.g., “Real Canadian Superstore Red Deer”). Only ingest content from public endpoints or private groups where written admin permission and user consent is obtained.
- **Mechanism:** Cloud Run scraper authenticates via a dedicated business-managed Facebook account using cookie-based session storage. Scraper visits group/page feed URLs, executes lightweight DOM extraction (using Playwright) to capture post text, author display name, media URLs, timestamps, reaction counts, and comment links.
- **Rate Limits & Compliance:** Throttle to <60 requests/hour per group, obey random human-like delays, refresh session cookies via Meta Graph API login flows monthly. Maintain audit log of crawling times and store raw HTML for 30 days for dispute resolution. Provide an opt-out mechanism if a community requests removal.
- **Data Handling:** Parsed posts are pushed to Pub/Sub `social-posts` topic. Cloud Function `deal-social-normaliser` applies NLP (spaCy or HuggingFace transformers) to detect product entities, prices, quantities, deal duration phrases, and store names; results stored in `social_posts` (raw) and `deals` (structured) collections.

### 5.2 Reddit Monitoring
- **API:** Reddit JSON API via OAuth2 (app registered under Reddit “script” type). Monitor `r/RedDeer`, `r/Alberta`, `r/Edmonton`, `r/Costco`, and `r/Frugal` with geographic filters.
- **Process:** Scheduled function (every 10 minutes) pulls new posts & comments, caches `fullname` IDs to avoid duplicates, applies same NLP pipeline. Respect 60 req/min limit and include descriptive User-Agent. Maintain pointer in Firestore for pagination.

### 5.3 Additional Digital Sources
- **Flyer & price data:** Integrate with Flipp API (Partnership) and store-specific APIs (e.g., Loblaws PC Express, Walmart Canada Open API) to capture official flyer prices for baseline comparisons.
- **RSS & Blogs:** Poll RedFlagDeals forums and local blogs offering RSS feeds; parse using Feedparser, route through same normaliser.

### 5.4 Store Metadata via Google Maps
- Detailed ingestion described in Section 2. Each store record enriched with:
  - `mapsPlaceId`, `mapsUrl`, `geo` (lat/lng), `openHours`, `plusCode`, `deliveryServices` (flagged by cross-referencing Instacart/ DoorDash coverage), `popularTimes` (if obtained via third-party providers like BestTime API), `lastFootTrafficSample`.
  - Photos (via Places Photos API) cached in Cloud Storage (respecting attribution requirements) for store cards.

### 5.5 Delivery Platform Catalogues
- **Instacart Developer Platform:** Use Catalog API to fetch retailer assortments, price, availability, and nutrition metadata. Align `instacartItemId` to internal SKU reference.
- **DoorDash:** Partner integration through DoorDash Drive or use approved data providers (e.g., `productdatascrape.com`) that expose REST endpoints for DashMart and partnered grocers. Establish legal agreement before production use; throttle per provider SLA.
- **Walmart Canada API:** Use Walmart’s Partner API for product lookup and pickup slot availability. Handle OAuth credential rotation and store mapping by postal code.
- **PC Express (Loblaws):** Reverse-proxy the PC Express GraphQL endpoints via Cloud Run with caching; ensure compliance with terms by formalising with Loblaw Digital if required.
- **SkipTheDishes/Uber Eats:** Where retailers participate, capture menu endpoints through approved affiliate programmes; otherwise, surface manual deep links only.

## 6. Data Storage Design (Firestore Collections)
| Collection | Purpose | Key Fields |
|------------|---------|-----------|
| `stores` | Canonical retailer list | `placeId`, `name`, `categories[]`, `address`, `geo`, `hours`, `contact`, `deliveryFlags`, `googleMetadata`, `lastVerifiedAt` |
| `deals` | Normalised deals (from social, user, delivery, flyers) | `dealId`, `sourceType`, `storeRef`, `productName`, `brand`, `category`, `unitSize`, `price`, `priceOriginal`, `currency`, `discountType`, `startAt`, `expectedEndAt`, `confidenceScore`, `evidenceRefs[]`, `createdBy`, `createdAt`, `status` |
| `social_posts` | Raw ingested social content | `platform`, `postId`, `url`, `author`, `content`, `media`, `scrapedAt`, `nlpStatus` |
| `user_deals` | User-submitted observations | `userId`, `storeRef`, `product`, `price`, `expiryDate`, `photoUrl`, `inventorySignal`, `trustScore` |
| `plans` | Shopping plans | `userId`, `period`, `budget`, `meals[]`, `items[]`, `deliveryPreferences`, `nutritionTargets`, `generatedAt`, `status` |
| `inventory` | Items owned with expiry | `userId`, `productRef`, `quantity`, `unit`, `expiryDate`, `sourceDealRef`, `status` |
| `ai_predictions` | Model outputs | `storeRef`, `category`, `predictionType`, `score`, `explanation`, `generatedAt`, `validUntil` |
| `metrics` | Aggregated stats | `userId`, `period`, `moneySaved`, `timeSavedMinutes`, `storesVisited`, `deliveriesScheduled`, `generatedAt` |

BigQuery tables mirror the above for analytics, fed via Firestore export or Cloud Functions streaming inserts.

## 7. Deal Understanding & Quality Controls
1. **NLP Pipeline:**
   - Tokenise and run Named Entity Recognition to capture products, quantities, monetary amounts, and temporal expressions.
   - Use a price resolver that handles CAD symbols (`$`, `CAD`, `dollars`), percentages, BOGO phrasing, multi-buy offers (e.g., “3 for $10”).
   - Store resolver matches mention to canonical store using fuzzy matching on store names, addresses, or landmarks; fallback prompt to manual reviewer if ambiguous.
   - Confidence scoring considers clarity of price, recency, corroboration from multiple sources, and user trust scores.
2. **Moderation Workflow:**
   - Low-confidence deals routed to a moderation queue inside the admin console (built on Firebase App Check + Role-Based Access Control). Moderators can approve, edit, or reject entries; actions logged for audit.
   - Automatic expiry detection using textual hints (“today only”, “until Sunday”) combined with survival analysis predictions to auto-archive deals past likely shelf life.
3. **Spam & Fraud Prevention:**
   - Rate-limit user submissions (e.g., 10 per hour) and apply anomaly detection (e.g., price unrealistic compared to historical data). Offending accounts flagged for review.

## 8. Predictive Intelligence & Analytics
- **Baseline Heuristics:** Encode known grocery markdown behaviours (e.g., meat discounts Friday afternoon, bakery markdowns evenings, produce markdowns Wednesday mornings) as rule-based triggers per store category.
- **Feature Collection:**
  - Historical deal logs (frequency, category, discount depth).
  - Store metadata (size, category, hours).
  - Third-party footfall metrics from BestTime API or Placer.ai (if licensing secured) to capture congestion and anomalies.
  - Weather data from Environment and Climate Change Canada (temperature swings, storms) and community event calendars (Red Deer Rebels games, festivals) to correlate with deal likelihood.
  - Inventory proxies such as Instacart availability flags (e.g., sudden out-of-stock could signal clearance) and price volatilities.
- **Model Approaches:**
  - **Temporal classification:** Gradient Boosted Trees (XGBoost/LightGBM) predicting probability of unadvertised deal occurrence for (store, category, time window) tuples.
  - **Bayesian hierarchical models:** capture store-level priors with shrinkage for low-data stores.
  - **Survival analysis:** Estimate how long unadvertised deals remain valid to time notifications.
  - **Anomaly detection:** Twitter’s Seasonal Hybrid ESD on foot traffic and price data to flag unusual activity.
- **Training Loop:** Daily batch feature engineering in BigQuery using scheduled Dataflow jobs; models trained in Vertex AI, versioned via MLflow. Prediction service deployed as Cloud Function returning next 48-hour likelihood per store/category.
- **Explainability:** Provide SHAP value summaries to end users (e.g., “Likely markdown because: Wednesday + historically high markdown frequency + low foot traffic forecast”).

## 9. Personalised Planning & Nutrition Engine
- **User Profile Data:** Age, sex, weight, height, activity level, dietary preferences, allergies, chronic conditions (optional), household size, budget cadence (weekly/monthly), mobility (car, transit, foot).
- **Nutrition Data Sources:**
  - Primary: Edamam Food Database API (nutrition facts, ingredient-level data). Comply with attribution and caching rules.
  - Secondary: USDA FoodData Central for items unavailable in Edamam (bulk staples, raw produce). Map by UPC or name using internal resolver.
- **Meal & Basket Optimisation:**
  - Build a library of budget-friendly meal templates annotated with nutritional macros and ingredient multipliers.
  - Use Mixed Integer Linear Programming (via `glpk.js` or server-side Python `PuLP`) to select meals and grocery items that meet calorie/macro targets while minimising cost subject to constraints (dietary restrictions, perishable usage before expiry, maximum travel distance, store count).
  - Provide interactive slider for budget vs nutrition trade-offs; recalculate suggestions in <2 seconds using Web Workers or serverless function.
- **Plan Adaptation:** When new deals appear, recompute plan deltas (cost savings, new pickup times) and highlight substitution suggestions. Update nutrition tallies accordingly.
- **Accessibility:** Provide text-to-speech summary and large-touch UI options for in-store usability.

## 10. Delivery & Pickup Orchestration
- **Instacart:**
  - OAuth login flow embedded via Instacart Connect. Sync user-authorised retailers, fetch live price & availability, and build carts using the Cart API. After plan finalisation, offer “Send to Instacart” which creates a draft cart with mapped SKUs and pushes user into Instacart checkout.
  - Capture service fee estimates via Instacart Fee API; surface true net savings (deal discount minus fees/tips) in the UI.
- **DoorDash & DashMart:**
  - Partner to obtain Storefront Catalog API or approved scraping service. Present deliverable items with markup vs in-store price. If direct cart creation not permitted, deep-link to DoorDash store pages with query parameters (store slug & product). Indicate required DashPass threshold for free delivery.
- **Walmart Canada / PC Express:**
  - Use official APIs or GraphQL endpoints to add items to online cart (server-side to avoid exposing tokens). Provide pickup time slot selection UI using returned slot data.
- **SkipTheDishes & Uber Eats:**
  - Identify participating convenience/grocery partners. Provide price comparisons, estimated delivery fees, and direct deep links to store/item. Note when pricing premiums make deals non-viable.
- **Logistics Intelligence:**
  - Maintain `deliveryQuotes` subcollection storing estimated fees, service charges, and ETAs so savings calculations remain accurate.
  - If multiple deliveries planned, cluster items to minimise number of platforms (k-means on store coordinates + availability) and notify user about consolidated checkout steps.

## 11. Crowdsourced Deal Workflow
- **Submission UX:** Single-tap FAB opens bottom sheet (with keyboard-aware height) letting users scan barcodes (via WebRTC camera), auto-detect product from Open Food Facts/instacart catalog, capture price, take photo, and set expiry.
- **Validation:**
  - Real-time duplicate detection using `minHash` similarity on product name + store + price.
  - Trust score increments when other users confirm (thumbs-up) or when the deal is corroborated by store receipts (photo OCR via Google Cloud Vision).
  - Gamified badges (“Frugal Scout”, “Fresh Saver”) after thresholds; leaderboards optional and privacy-conscious.
- **Plan Integration:** Deals user adds automatically join their `inventory` with expiry reminders, and propagate to saved plans with acceptance toggle. Conflict resolution (e.g., two deals for same item) uses a change review screen showing cost difference and nutrition impact.

## 12. Savings & Time Metrics Engine
- **Money Saved Calculation:**
  - Maintain baseline price table using historical flyer data, average shelf prices from Instacart/Walmart APIs, and user-confirmed regular prices.
  - For each acquired deal, compute `savings = (baselinePrice - actualPrice) * quantity`. Log to `metrics` with supporting source references.
  - Provide breakdown by store, category, delivery vs in-store, and cumulative total since signup.
- **Time Saved Estimation:**
  - Compare planned route vs naïve route (travelling salesman solution) to estimate driving time saved.
  - Use foot-traffic forecasts to quantify queue time avoided (e.g., mapping BestTime crowd levels to minutes saved).
  - Track minutes spent on in-app planning vs estimated average planning time (baseline derived from user research). Display weekly summary in dashboard.
- **User Feedback Loop:** Let users adjust perceived time savings to calibrate model, storing correction factor for future estimates.

## 13. Security, Privacy, and Compliance
- Comply with **PIPEDA** and Alberta’s Personal Information Protection Act. Provide transparent privacy policy detailing data collected (profile, shopping habits, social media links) and purpose.
- Sensitive data (health info, household composition) stored encrypted at rest (Firestore + CMEK) and in transit (HTTPS only). Access controlled via Firebase Custom Claims and security rules.
- Obtain explicit consent before linking third-party accounts (Facebook, Instacart, DoorDash). Offer revocation controls and honour data deletion requests within 30 days.
- Respect platform Terms of Service; maintain documentation of permissions for any scraped content. Provide notice to communities when their content powers deal feeds and honour takedown requests.
- Implement anomaly detection for account takeover (monitor unusual IP/device combos via Firebase Auth multi-factor enforcement for admins).

## 14. Observability, QA, and Reliability
- Centralised logging via Google Cloud Logging with structured fields (trace IDs, user IDs hashed). Alerts configured in Cloud Monitoring for ingestion failures, API quota exhaustion, data pipeline lag, and prediction anomalies.
- Automated regression suite: Jest/React Testing Library for UI, Mocha/Chai for Cloud Functions, and Cypress for end-to-end flows (including keyboard overlay behaviour).
- Synthetic monitoring hits key endpoints (deal feed, store search, plan generation) every 5 minutes from multiple regions.
- Implement feature flags (LaunchDarkly or Firebase Remote Config) to stage new capabilities gradually.
- Disaster recovery: nightly Firestore export to Cloud Storage with 30-day retention; Cloud Run blue/green deployments for zero downtime.

## 15. Implementation Roadmap
1. **Phase 0 – Foundations (Weeks 1-2):**
   - Set up Firebase project, auth providers, CI/CD pipeline, error logging, and baseline React PWA shell with keyboard-aware layout scaffolding.
   - Implement Google Places ingestion pipeline and verify complete store coverage with automated tests.
2. **Phase 1 – Core Deal Aggregation (Weeks 3-6):**
   - Reddit ingestion + NLP normaliser; build deal feed UI bound to live Firestore data.
   - Deploy community submission flow with moderation queue and metrics tracking.
   - Stand up MVP AI heuristic service (rule-based predictions) surfaced in UI.
3. **Phase 2 – Planning & Nutrition (Weeks 7-10):**
   - Integrate Edamam/USDA nutrition APIs; implement meal template library and optimisation engine.
   - Launch budgeting dashboard with savings/time metrics and inventory tracker.
4. **Phase 3 – Delivery Integrations (Weeks 11-14):**
   - Complete Instacart OAuth + cart handoff; add Walmart/PC Express connectors; expose fee-aware comparisons.
   - Pilot DoorDash integration with limited set of stores, gather feedback, and refine UI messaging about fees.
5. **Phase 4 – Advanced AI & Scaling (Weeks 15-20):**
   - Ingest foot traffic/weather/event data; train first ML model in Vertex AI; integrate predictions with explanations.
   - Expand to additional nearby communities and evaluate expansion readiness for other Alberta cities.

## 16. Risk Register & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Facebook access revoked | Loss of social deal visibility | Maintain admin partnerships, pivot to user submissions & Reddit, schedule re-auth checks, diversify sources. |
| API quota exhaustion (Google/Instacart) | Data freshness degraded | Implement adaptive throttling, request higher quotas with usage evidence, cache results aggressively. |
| Delivery price markups negate savings | User trust erosion | Always show delivered price inclusive of fees, highlight in-store alternative, enable user-defined fee thresholds. |
| NLP misclassifies deals | Incorrect recommendations | Human-in-loop moderation, continuous model evaluation, fallback to manual classification when confidence <0.6. |
| Privacy concerns over social scraping | Reputation damage | Public-only content, consent processes, allow opt-outs, store minimal personal data, legal review prior to launch. |

## 17. Appendices
### A. External API & Data Source Matrix
| Source | Access Method | Rate Limits | Data Returned | Legal/Notes |
|--------|---------------|-------------|---------------|-------------|
| Google Places API | REST (Text Search, Nearby, Details, Photos) | 1000 free units/day; rate limit 50 req/s | Store names, addresses, hours, place IDs, photos | Requires API key, attribution, billing. |
| Facebook Groups/Pages | Headless browser scrape (Playwright) | Self-imposed <60 req/hr/group | Posts, comments, reactions | Ensure permission, obey ToS, rotate accounts. |
| Reddit API | OAuth JSON endpoints | 60 req/min, bursts allowed | Posts, comments, metadata | Respect Reddit API terms, include User-Agent. |
| Instacart Developer Platform | REST + OAuth | Per agreement (typ. 5 req/s) | Product catalog, pricing, nutrition, cart | Requires partner approval, confidentiality obligations. |
| DoorDash Storefront | Partner API or approved data provider | Provider-specific | Product listings, fees, availability | Formal partner agreement, follow caching rules. |
| Walmart Canada API | REST + OAuth | 5-10 req/s depending on tier | Product info, price, pickup slots | Requires partner onboarding, compliance review. |
| Edamam Food Database | REST with API key | 10 req/min (free), higher with paid | Nutrition facts, diet labels | Attribution mandatory. |
| USDA FoodData Central | REST | ~1000 req/hr | Nutrition detail for basic foods | Free, requires API key. |
| BestTime / Placer.ai | REST | Tiered | Foot traffic forecasts, live busyness | Paid licence, restrict data sharing. |
| Environment Canada Weather | REST/XML | Generous | Weather forecasts & alerts | Free with attribution. |

### B. Key Compliance References
- PIPEDA, Alberta PIPA, Google Places Terms, Instacart Developer Terms, DoorDash Drive API Agreement, Edamam ToS, Reddit API Terms, Facebook Platform Policy.

