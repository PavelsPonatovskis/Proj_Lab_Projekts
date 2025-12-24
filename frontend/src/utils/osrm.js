// src/utils/osrm.js
const OSRM_BASE = "https://router.project-osrm.org";

/**
 * Build ONE road route through all stops.
 * stops: [{lat:number, lng:number}, ...]
 * Returns { latlngs, distance, duration }
 */
export async function buildRoadRoute(stops, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 12000;
  const profile = opts.profile ?? "driving";

  if (!Array.isArray(stops) || stops.length < 2) {
    return { latlngs: [], distance: 0, duration: 0 };
  }

  // validate coords early (prevents OSRM 400)
  for (let i = 0; i < stops.length; i++) {
    const lat = Number(stops[i]?.lat);
    const lng = Number(stops[i]?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`Invalid stop coords at index ${i}: ${JSON.stringify(stops[i])}`);
    }
  }

  const coords = stops.map((p) => `${p.lng},${p.lat}`).join(";");
  const url =
    `${OSRM_BASE}/route/v1/${profile}/${coords}` +
    `?overview=full&geometries=geojson&steps=false`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OSRM failed (${res.status}) ${text}`);
    }

    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route?.geometry?.coordinates?.length) {
      throw new Error("OSRM returned no route geometry");
    }

    const latlngs = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);

    return {
      latlngs,
      distance: route.distance ?? 0,
      duration: route.duration ?? 0,
    };
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error("OSRM request timed out (AbortError)");
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}
