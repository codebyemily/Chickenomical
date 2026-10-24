import { brightDataJson } from "../bright-data.mjs";
import { milesBetween } from "../geo.mjs";

export async function locateMcdonalds(origin, { radiusMiles, limit }) {
  const url = new URL("https://www.mcdonalds.com/googleappsv2/geolocation");
  url.searchParams.set("latitude", String(origin.latitude));
  url.searchParams.set("longitude", String(origin.longitude));
  url.searchParams.set("radius", String(radiusMiles));
  url.searchParams.set("maxResults", String(limit));
  url.searchParams.set("country", "us");
  url.searchParams.set("language", "en-us");
  const payload = await brightDataJson(url);
  return (payload.features ?? [])
    .map((feature) => {
      const props = feature.properties ?? {};
      const [longitude, latitude] = feature.geometry?.coordinates ?? [];
      return {
        id: String(props.identifierValue ?? props.id),
        name: props.longDescription || props.addressLine1,
        address: [props.addressLine1, props.customAddress || props.addressLine3].filter(Boolean).join(", "),
        latitude: Number(latitude),
        longitude: Number(longitude),
        distance_miles: roundMiles(milesBetween(origin, { latitude: Number(latitude), longitude: Number(longitude) })),
        pickup: true,
      };
    })
    .filter((store) => store.id && Number.isFinite(store.latitude) && store.distance_miles <= radiusMiles)
    .sort((a, b) => a.distance_miles - b.distance_miles)
    .slice(0, limit);
}

function roundMiles(value) {
  return Math.round(Number(value) * 100) / 100;
}

export async function mcdonaldsOffers() {
  return [];
}
