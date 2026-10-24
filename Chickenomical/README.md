# Welcome to your Convex + React (Vite) + WorkOS AuthKit app

This is a [Convex](https://convex.dev/) project created with [`npm create convex`](https://www.npmjs.com/package/create-convex).

After the initial setup (<2 minutes) you'll have a working full-stack app using:

- Convex as your backend (database, server logic)
- [React](https://react.dev/) as your frontend (web page interactivity)
- [Vite](https://vitest.dev/) for optimized web hosting
- [Tailwind](https://tailwindcss.com/) for building great looking accessible UI
- [WorkOS AuthKit](https://workos.com/docs/authkit) for authentication

## Get started

If you just cloned this codebase and didn't use `npm create convex`, run:

```
npm install
npm run dev
```

If you're reading this README on GitHub and want to use this template, run:

```
npm create convex@latest -- -t react-vite-workos-authkit
```

Then:

1. Sign up for [WorkOS](https://workos.com/) and create an application
2. Copy `.env.local.example` to `.env.local` and configure:
   - `VITE_WORKOS_CLIENT_ID`: Your WorkOS client ID
   - `VITE_WORKOS_REDIRECT_URI`: Your redirect URI (default: http://localhost:5173/callback)
   - `VITE_CONVEX_URL`: Your Convex deployment URL
3. Configure your WorkOS client ID as `WORKOS_CLIENT_ID` in your Convex dashboard environment variables

## Menu ingestion

The existing Bright Data adapters in `../scrapers/brightdata` can now push their normalized output into Convex. Configure deployment secrets—never `VITE_*` variables—for the providers and ingestion endpoint:

```bash
npx convex env set BRIGHTDATA_API_TOKEN <token>
npx convex env set BRIGHTDATA_UNLOCKER_ZONE web_unlocker1
npx convex env set APIFY_TOKEN <token>
npx convex env set APIFY_DOORDASH_ACTOR_ID dz_omar/doordash-scraper
npx convex env set APIFY_UBEREATS_ACTOR_ID datacach/ubereats-menu-scraper
npx convex env set INGEST_SHARED_SECRET <long-random-secret>
```

For the local Bright Data runner, add these non-committed root `.env` values:

```text
CONVEX_INGEST_URL=https://<deployment>.convex.site/ingest/brightdata
CONVEX_INGEST_SECRET=<same value as INGEST_SHARED_SECRET>
```

Then collect and ingest one location in one command:

```bash
cd ../scrapers/brightdata
npm run scrape -- --address "3123 Silver Creek Rd, San Jose, CA 95121" --radius 5 --limit 1 wendys --push-convex
```

The endpoint verifies the shared secret, records a `scrapeJobs` row, and upserts normalized `menuOffers` using `offer_key`.

### Menu-scraping actions

`convex/scrapers.ts` contains authenticated server-side actions for Bright Data and Apify. Set their secrets on the Convex deployment, not in Vite or browser environment variables:

```bash
npx convex env set BRIGHTDATA_API_TOKEN <replacement-token>
npx convex env set BRIGHTDATA_UNLOCKER_ZONE web_unlocker1
npx convex env set APIFY_TOKEN <replacement-token>
npx convex env set APIFY_DOORDASH_ACTOR_ID dz_omar/doordash-scraper
npx convex env set APIFY_UBEREATS_ACTOR_ID datacach/ubereats-menu-scraper
```

The Bright Data action accepts only approved first-party ordering hosts. The Apify actions accept only `doordash.com` or `ubereats.com` store URLs, start a one-store run, and expose a separate authenticated status/result poll. They do not expose provider credentials to the client. Marketplace list prices must still be normalized and compared with the corresponding first-party price; fees and promotions are separate evidence.

For user management and webhook integration with WorkOS, check out the [WorkOS documentation](https://workos.com/docs/user-management).

## Learn more

To learn more about developing your project with Convex, check out:

- The [Tour of Convex](https://docs.convex.dev/get-started) for a thorough introduction to Convex principles.
- The rest of [Convex docs](https://docs.convex.dev/) to learn about all Convex features.
- [Stack](https://stack.convex.dev/) for in-depth articles on advanced topics.

## Join the community

Join thousands of developers building full-stack apps with Convex:

- Join the [Convex Discord community](https://convex.dev/community) to get help in real-time.
- Follow [Convex on GitHub](https://github.com/convex/), star and contribute to the open-source implementation of Convex.
