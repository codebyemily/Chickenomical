const EARTH_RADIUS_MILES = 3958.8;

export function milesBetween(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const lat1 = radians(from.latitude);
  const lat2 = radians(to.latitude);
  const dLat = radians(to.latitude - from.latitude);
  const dLng = radians(to.longitude - from.longitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

export async function geocode(address: string) {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: address,
    format: "json",
    limit: "1",
  })}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Chickenomical/1.0 (chicken takeout comparison)",
      Accept: "application/json",
    },
  });
  const rows = await response.json();
  const hit = Array.isArray(rows) ? rows[0] : null;
  if (!hit) throw new Error(`No coordinates found for "${address}".`);
  return {
    latitude: Number(hit.lat),
    longitude: Number(hit.lon),
    label: String(hit.display_name ?? address),
  };
}

function radians(degrees: number) {
  return degrees * Math.PI / 180;
}
