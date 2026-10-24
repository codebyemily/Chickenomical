# Chickenomical Expo prototype

An adaptive Expo Router prototype for comparing nearby chicken nugget and tender prices. iOS and Android use Expo Router native tabs, Expo UI controls, and native stack navigation; Expo Web keeps a responsive browser layout.

The visual reference is `../visualizer/`: the field-report masthead, yellow price signal, DM Sans / Space Mono typography, offer board, and store coverage panel are recreated through the existing React Native shared components. Expo Web uses a table at wide board widths and stacked offer rows on small screens. Native retains the system tabs, stack navigation, and Expo UI controls.

## Start the web app

Run these commands from the repository root:

    cd expo
    pnpm install
    pnpm web

The prototype uses local fixture data and local UI state only. No database, menu feed, geocoder, live location request, authentication, or checkout is connected. Synthetic prices and locations are labeled throughout the UI.

See SCREEN_MAP.md for the screen list, the reason for each screen, and the intended review paths. Product and visual requirements are in the repository-level PRODUCT.md and DESIGN.md.

## Stress review

With the development server running, open `/?stress=1` to switch Compare between Demo data, Worst case, Empty, One, and 1,000-row fixtures. The selection stays in the URL. These controls require development mode and an explicit opt-in; ordinary screens and production renders do not show them.

Stress records exercise the existing comparison and offer-row layouts. Their detail links open the corresponding original demo records. The original fixture data remains unchanged.
