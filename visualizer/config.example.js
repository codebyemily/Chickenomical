// Copy to config.local.js (gitignored) and fill in values from Chickenomical/.env.local + root .env.
export const config = {
  convexUrl: "https://YOUR-DEPLOYMENT.convex.cloud",
  siteUrl: "https://YOUR-DEPLOYMENT.convex.site",
  // Same value as Convex INGEST_SHARED_SECRET / root CONVEX_INGEST_SECRET.
  ingestSecret: "YOUR-INGEST-SHARED-SECRET",
};
