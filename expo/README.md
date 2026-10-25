# Chickenomical Expo prototype

An adaptive Expo Router prototype for comparing nearby chicken offers. iOS and Android use Expo Router native tabs, Expo UI controls, and native stack navigation; Expo Web keeps a responsive browser layout.

The compact Compare screen puts restaurant chains in columns and menu quantities in rows. Each cell leads with that chain's lowest nearby pickup price per unit, with the total underneath; the lowest per-unit chain price is highlighted. Matrices keep documented schema variants, currency, and pickup channel matched, and a price opens its source-linked menu offer. The Explore tab filters stored menu offers by chain and category; the current backend schema has no deals table.

The visual reference is `../visualizer/`: the field-report masthead, yellow price signal, DM Sans / Space Mono typography, offer board, and store coverage panel are recreated through the existing React Native shared components. The visualizer reads the grouped `offers:board` Convex query and starts scrapes through its secret-protected site endpoint. Expo subscribes to that same board query for read-only menu data; it does not start scrapes. Expo Web uses a table at wide board widths and stacked offer rows on small screens. Native retains the system tabs, stack navigation, and Expo UI controls.

## Start the web app

Run these commands from the repository root:

    cd expo
    pnpm install
    cp .env.example .env.local
    pnpm web

Set `EXPO_PUBLIC_CONVEX_URL` in `.env.local` to the Convex deployment URL. The URL is public client configuration; do not put deploy keys or ingestion secrets in Expo environment variables.

The Expo root installs a `ConvexProvider`. `src/data/convex-api.ts` declares the typed reference to `offers:board`, and `src/data/live-offers.ts` flattens the board's chain/store groups into the screen model while retaining the query origin, scrape job, observation time, and offer count. The backend schema has no deals table. Distance is the value recorded during each crawl; changing the radius filters that saved value and does not recalculate it around the device.

See SCREEN_MAP.md for the screen list, the reason for each screen, and the intended review paths. Product and visual requirements are in the repository-level PRODUCT.md and DESIGN.md.

## Stress review

With the development server running, open `/?stress=1` to switch Compare between Demo data, Worst case, Empty, One, and 1,000-row fixtures. The selection stays in the URL. These controls require development mode and an explicit opt-in; ordinary screens and production renders do not show them.

Stress records exercise the existing comparison and offer-row layouts. Their detail links open the corresponding original demo records. The original fixture data remains unchanged.
