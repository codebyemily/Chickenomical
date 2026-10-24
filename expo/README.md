# Chickenomical Expo prototype

An adaptive Expo Router prototype for comparing nearby chicken offers. iOS and Android use Expo Router native tabs, Expo UI controls, and native stack navigation; Expo Web keeps a responsive browser layout.

The compact Compare screen puts restaurant chains in columns and menu quantities in rows. Each cell leads with that chain's lowest nearby pickup price per unit, with the total underneath; the lowest per-unit chain price is highlighted. Matrices keep documented schema variants, currency, and pickup channel matched, and a price opens its source-linked menu offer. The Explore tab lets users pick a chain and menu category to browse offers and deals.

The visual reference is `../visualizer/`: the field-report masthead, yellow price signal, DM Sans / Space Mono typography, offer board, and store coverage panel are recreated through the existing React Native shared components. Expo Web uses a table at wide board widths and stacked offer rows on small screens. Native retains the system tabs, stack navigation, and Expo UI controls.

## Start the web app

Run these commands from the repository root:

    cd expo
    pnpm install
    pnpm web

`src/data/menu-schema.ts` mirrors the shared contract in `../docs/menu-data-structure.md`. Local records in `src/data/mock-convex-data.ts` use the schema's snake_case offer and deal fields, and `src/data/mock-convex.ts` exposes Convex-shaped async queries used by the screens. This is an in-memory mock: Convex is not installed or connected, and all prices, locations, provider IDs, source URLs, and timestamps are synthetic.

When Convex is implemented, replace the mock query adapter with generated Convex API references and `useQuery`; the screen model already consumes the shared chain, location, menu offer, and deal records.

See SCREEN_MAP.md for the screen list, the reason for each screen, and the intended review paths. Product and visual requirements are in the repository-level PRODUCT.md and DESIGN.md.

## Stress review

With the development server running, open `/?stress=1` to switch Compare between Demo data, Worst case, Empty, One, and 1,000-row fixtures. The selection stays in the URL. These controls require development mode and an explicit opt-in; ordinary screens and production renders do not show them.

Stress records exercise the existing comparison and offer-row layouts. Their detail links open the corresponding original demo records. The original fixture data remains unchanged.
