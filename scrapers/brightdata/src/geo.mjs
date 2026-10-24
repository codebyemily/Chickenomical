const EARTH_RADIUS_MILES = 3958.8;

export function milesBetween(from, to) {
  const lat1 = radians(from.latitude);
  const lat2 = radians(to.latitude);
  const dLat = radians(to.latitude - from.latitude);
  const dLng = radians(to.longitude - from.longitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

export function parseAt(value) {
  const match = String(value ?? "").trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) {
    throw new Error(`Expected --at as latitude,longitude. Received "${value}".`);
  }
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error(`Coordinates ${latitude},${longitude} are out of range.`);
  }
  return { latitude, longitude };
}

export async function geocode(address, fetchJson) {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: address,
    format: "json",
    limit: "1",
  })}`;
  const rows = await fetchJson(url, {
    headers: {
      "User-Agent": "Chickenomical/1.0 (chicken takeout comparison)",
      Accept: "application/json",
    },
  });
  const hit = Array.isArray(rows) ? rows[0] : null;
  if (!hit) throw new Error(`No coordinates found for "${address}".`);
  return {
    latitude: Number(hit.lat),
    longitude: Number(hit.lon),
    label: hit.display_name,
  };
}

function radians(degrees) {
  return degrees * Math.PI / 180;
}
