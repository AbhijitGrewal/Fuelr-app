import { fetchNSWNearby, NSW_FUEL_CODES } from './nswFuelAPI';

export interface GasStation {
  id: string;
  name: string;
  brand: string;
  address: string;
  latitude: number;
  longitude: number;
  e10Price: number;
  ulp91Price: number;
  ulp95Price?: number;
  ulp98Price?: number;
  dieselPrice?: number;
  distanceKm: number;
  lastUpdated: Date;
  isLivePrice: boolean;
}

export type FuelType = 'E10' | 'Unleaded 91' | 'Unleaded 95' | 'Unleaded 98' | 'Diesel';
export const FUEL_TYPES: FuelType[] = ['Unleaded 91', 'E10', 'Unleaded 95', 'Unleaded 98', 'Diesel'];

export function getPrice(station: GasStation, fuelType: FuelType): number {
  switch (fuelType) {
    case 'E10':          return station.e10Price;
    case 'Unleaded 91':  return station.ulp91Price;
    case 'Unleaded 95':  return station.ulp95Price ?? station.ulp91Price + 8;
    case 'Unleaded 98':  return station.ulp98Price ?? station.ulp91Price + 16;
    case 'Diesel':       return station.dieselPrice ?? station.ulp91Price + 5;
  }
}

export function formatPrice(price: number): string {
  return `${price.toFixed(1)}`;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)} km`;
}

function isInNSW(lat: number, lng: number): boolean {
  return lat > -37.6 && lat < -28.0 && lng > 140.9 && lng < 153.7;
}
function isInTAS(lat: number, lng: number): boolean {
  return lat > -43.8 && lat < -39.4 && lng > 143.7 && lng < 148.6;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─────────────────────────────────────────────
// NSW API — fetch fuel types sequentially with
// a 700ms gap to stay under the 5 req/min limit
// ─────────────────────────────────────────────
async function fetchNSWStations(
  lat: number, lng: number, radiusKm: number
): Promise<GasStation[]> {

  const fuelTypes: FuelType[] = ['Unleaded 91', 'E10', 'Unleaded 95', 'Unleaded 98', 'Diesel'];
  const map: Record<string, { info: any; prices: Partial<Record<FuelType, number>> }> = {};

  for (let i = 0; i < fuelTypes.length; i++) {
    const ft = fuelTypes[i];
    if (i > 0) await sleep(700); // 700ms gap = max ~5 req / 3.5s, well under limit

    try {
      const data = await fetchNSWNearby(lat, lng, radiusKm, NSW_FUEL_CODES[ft]);

      for (const st of (data.stations ?? [])) {
        const id = String(st.stationid ?? st.code);
        if (!map[id]) map[id] = { info: st, prices: {} };
      }
      for (const p of (data.prices ?? [])) {
        const id = String(p.stationcode ?? p.stationid);
        if (map[id]) map[id].prices[ft] = parseFloat(p.price);
      }
    } catch (e) {
      // If one fuel type fails (rate limit), skip it — others still show
      console.warn(`NSW fetch failed for ${ft}:`, e);
    }
  }

  const stations: GasStation[] = [];
  for (const { info, prices } of Object.values(map)) {
    const ulp91 = prices['Unleaded 91'];
    const e10   = prices['E10'];
    if (!ulp91 && !e10) continue;

    const stLat = parseFloat(info.location?.latitude  ?? info.lat ?? 0);
    const stLng = parseFloat(info.location?.longitude ?? info.lng ?? 0);
    if (!stLat || !stLng) continue;

    const base = ulp91 ?? (e10! + 3);

    stations.push({
      id:          String(info.stationid ?? info.code),
      name:        info.name  ?? info.brand ?? 'Service Station',
      brand:       info.brand ?? info.name  ?? 'Service Station',
      address:     [info.address, info.suburb].filter(Boolean).join(', '),
      latitude:    stLat,
      longitude:   stLng,
      e10Price:    prices['E10']         ?? parseFloat((base - 3).toFixed(1)),
      ulp91Price:  prices['Unleaded 91'] ?? base,
      ulp95Price:  prices['Unleaded 95'],
      ulp98Price:  prices['Unleaded 98'],
      dieselPrice: prices['Diesel'],
      distanceKm:  haversine(lat, lng, stLat, stLng),
      lastUpdated: new Date(),
      isLivePrice: true,
    });
  }

  return stations.sort((a, b) => a.ulp91Price - b.ulp91Price);
}

// ─────────────────────────────────────────────
// Fallback estimates for non-NSW states
// ─────────────────────────────────────────────
function getBasePrice(lat: number, lng: number): number {
  if (lat > -38.2 && lat < -37.5 && lng > 144.5 && lng < 145.5) return 182.9;
  if (lat > -27.8 && lat < -27.2 && lng > 152.8 && lng < 153.3) return 188.9;
  if (lat > -32.2 && lat < -31.7 && lng > 115.6 && lng < 116.1) return 193.9;
  if (lat > -35.2 && lat < -34.7 && lng > 138.4 && lng < 139.0) return 184.9;
  if (lat > -28.3 && lat < -27.8 && lng > 153.2 && lng < 153.6) return 191.9;
  if (lat > -15   && lat < -11   && lng > 130   && lng < 132  ) return 202.9;
  if (lat < -40)                                                  return 189.9;
  return 188.9;
}

const AU_BRANDS = [
  'Shell Coles Express', 'BP', 'Ampol', '7-Eleven',
  'Caltex Woolworths', 'United', 'Puma Energy',
  'Metro Fuel', 'Liberty', 'Viva Energy',
];

async function fetchEstimatedStations(
  lat: number, lng: number, radiusKm: number
): Promise<GasStation[]> {
  const radiusM = radiusKm * 1000;
  const query   = `[out:json][timeout:12];node["amenity"="fuel"](around:${radiusM},${lat},${lng});out body 20;`;

  try {
    const res  = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    const json = await res.json();
    const base = getBasePrice(lat, lng);

    return (json.elements ?? []).slice(0, 16)
      .filter((el: any) => el.lat && el.lon)
      .map((el: any, i: number) => {
        const tags = el.tags ?? {};
        const v    = ((i * 41 + 7) % 17) * 0.9 - 8;
        const u91  = Math.max(150, base + v);
        return {
          id:          String(el.id ?? `st-${i}`),
          name:        tags.name ?? tags.brand ?? AU_BRANDS[i % AU_BRANDS.length],
          brand:       tags.brand ?? AU_BRANDS[i % AU_BRANDS.length],
          address:     tags['addr:street']
            ? `${tags['addr:housenumber'] ?? ''} ${tags['addr:street']}`.trim()
            : `${el.lat.toFixed(3)}, ${el.lon.toFixed(3)}`,
          latitude:    el.lat, longitude: el.lon,
          e10Price:    parseFloat((u91 - 3).toFixed(1)),
          ulp91Price:  parseFloat(u91.toFixed(1)),
          ulp95Price:  parseFloat((u91 + 8).toFixed(1)),
          ulp98Price:  parseFloat((u91 + 16).toFixed(1)),
          dieselPrice: i % 4 !== 3 ? parseFloat((u91 + 5).toFixed(1)) : undefined,
          distanceKm:  parseFloat(haversine(lat, lng, el.lat, el.lon).toFixed(2)),
          lastUpdated: new Date(),
          isLivePrice: false,
        };
      })
      .sort((a: GasStation, b: GasStation) => a.ulp91Price - b.ulp91Price);
  } catch {
    return fallbackStations(lat, lng, radiusKm);
  }
}

function fallbackStations(lat: number, lng: number, radiusKm: number): GasStation[] {
  const base = getBasePrice(lat, lng);
  return Array.from({ length: 10 }, (_, i) => {
    const angle = (i * 360 / 10) * (Math.PI / 180);
    const dist  = (((i % 4) + 1) / 4) * radiusKm * 0.85;
    const dDeg  = dist / 111;
    const u91   = Math.max(150, base + ((i * 41 + 7) % 17) * 0.9 - 8);
    return {
      id: `fb-${i}`, name: AU_BRANDS[i % AU_BRANDS.length],
      brand: AU_BRANDS[i % AU_BRANDS.length],
      address: `${100 + i * 127} Example Street`,
      latitude:  lat + dDeg * Math.sin(angle),
      longitude: lng + (dDeg / Math.cos(lat * Math.PI / 180)) * Math.cos(angle),
      e10Price:    parseFloat((u91 - 3).toFixed(1)),
      ulp91Price:  parseFloat(u91.toFixed(1)),
      ulp95Price:  parseFloat((u91 + 8).toFixed(1)),
      ulp98Price:  parseFloat((u91 + 16).toFixed(1)),
      dieselPrice: i % 4 !== 3 ? parseFloat((u91 + 5).toFixed(1)) : undefined,
      distanceKm:  parseFloat(dist.toFixed(2)),
      lastUpdated: new Date(), isLivePrice: false,
    };
  }).sort((a, b) => a.ulp91Price - b.ulp91Price);
}

export async function fetchNearbyStations(
  lat: number, lng: number, radiusKm: number = 10
): Promise<GasStation[]> {
  if (isInNSW(lat, lng) || isInTAS(lat, lng)) {
    try {
      const results = await fetchNSWStations(lat, lng, radiusKm);
      if (results.length > 0) return results;
    } catch (e) {
      console.warn('NSW API failed, using estimates:', e);
    }
  }
  return fetchEstimatedStations(lat, lng, radiusKm);
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2));
}
