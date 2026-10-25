# Chickenomical Expo prototype

An adaptive Expo Router prototype for comparing nearby chicken offers. Native uses Expo Router stack navigation and Expo UI controls; Expo Web keeps a responsive browser layout with top navigation.

The compact Compare screen puts restaurant chains in columns and menu quantities in rows. Each cell leads with that chain's lowest nearby pickup price per unit, with the total underneath; the lowest per-unit chain price is highlighted. Matrices keep documented schema variants, currency, and pickup channel matched, and a price opens its source-linked menu offer. The Explore tab filters stored menu offers by chain and category; the current backend schema has no deals table.

The visual reference is `../visualizer/`: the field-report masthead, yellow price signal, DM Sans / Space Mono typography, offer board, and store coverage panel are recreated through the existing React Native shared components. Expo starts nearby scrapes through the Cloudflare Worker proxy, which forwards to Convex's shared-secret `/scrape/near` route. The secret stays on the Worker. Expo Web uses the same-origin `/api/scrape/near` path; native builds use the deployed Worker by default, with `EXPO_PUBLIC_SCRAPE_PROXY_URL` available to override it. Both platforms subscribe to the resulting `offers:board` job and update as the scrape runs. Expo Web uses a table at wide board widths and stacked offer rows on small screens. Native retains stack navigation and Expo UI controls.

## Start the web app

For a full local web flow with the scrape proxy, run these commands from the repository root:

    cd expo
    pnpm install
    cp .env.example .env.local
    cp .dev.vars.example .dev.vars
    # Replace the example value in .dev.vars with the existing Convex shared secret.
    # Set EXPO_PUBLIC_SCRAPE_PROXY_URL=http://localhost:8787 in .env.local to use the local Worker.
    pnpm export:web
    pnpm worker:dev

The public Convex and Cloudflare Worker URLs are in `app.json` under `expo.extra`, so local and EAS builds need no Expo runtime variables. Set `EXPO_PUBLIC_CONVEX_URL` or `EXPO_PUBLIC_SCRAPE_PROXY_URL` in `.env.local` or the matching EAS environment only to override them for another deployment. These URLs are public client configuration; do not put deploy keys or ingestion secrets in Expo environment variables.

## Cloudflare Worker proxy

The Worker serves the exported web app and forwards `POST /api/scrape/near` to the Convex site route. Deploy the Convex functions first, then set a Cloudflare Worker secret to the same value as the Convex deployment's `INGEST_SHARED_SECRET`:

    cd expo
    pnpm export:web
    pnpm worker:dev

For deployment, set the secret with `pnpm exec wrangler secret put CONVEX_INGEST_SHARED_SECRET`, then run `pnpm export:web` and `pnpm worker:deploy`. The Convex site URL is configured in `wrangler.jsonc`.

Native builds use the Worker URL from `app.json`; Expo Web hosted by this Worker calls its same-origin route. Set `EXPO_PUBLIC_SCRAPE_PROXY_URL` only when you need to override the Worker origin (for example, to use a staging Worker). This is a public URL, not a secret.

The Worker applies a coarse limit of five scrape starts per minute per client IP. Searches still run only after the user presses Compare, not when `/search` opens or location permission resolves. For UI iteration through `pnpm web`, set `EXPO_PUBLIC_SCRAPE_PROXY_URL` to the deployed Worker origin; Metro itself does not serve the Worker API route. For a local Worker, set it to `http://localhost:8787` before exporting.

The Expo root installs a `ConvexProvider`. `src/data/convex-api.ts` declares the typed reference to `offers:board`, and `src/data/live-offers.ts` flattens the board's chain/store groups into the screen model while retaining the query origin, scrape job, observation time, and offer count. The backend schema has no deals table. Nearby scrapes use the coordinates already resolved by `/search`, avoiding a second address lookup on the server. Distance is recalculated in the app around the active search origin.

See SCREEN_MAP.md for the screen list, the reason for each screen, and the intended review paths. Product and visual requirements are in the repository-level PRODUCT.md and DESIGN.md.

## Stress review

With the development server running, open `/?stress=1` to switch Compare between Demo data, Worst case, Empty, One, and 1,000-row fixtures. The selection stays in the URL. These controls require development mode and an explicit opt-in; ordinary screens and production renders do not show them.

Stress records exercise the existing comparison and offer-row layouts. Their detail links open the corresponding original demo records. The original fixture data remains unchanged.
