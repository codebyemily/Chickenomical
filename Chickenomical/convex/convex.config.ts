import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    BRIGHTDATA_API_TOKEN: v.string(),
    BRIGHTDATA_UNLOCKER_ZONE: v.string(),
    APIFY_TOKEN: v.string(),
    APIFY_DOORDASH_ACTOR_ID: v.string(),
    APIFY_UBEREATS_ACTOR_ID: v.string(),
    INGEST_SHARED_SECRET: v.string(),
  },
});

export default app;
