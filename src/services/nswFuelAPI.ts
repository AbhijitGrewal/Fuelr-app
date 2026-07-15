// ─────────────────────────────────────────────
// NSW FuelCheck API — OAuth 2.0
// Source: https://api.nsw.gov.au/Documentation/GenerateHar/22
// Token:  GET  api.onegov.nsw.gov.au/oauth/client_credential/accesstoken
// Nearby: POST api.onegov.nsw.gov.au/FuelPriceCheck/v2/fuel/prices/nearby
// ─────────────────────────────────────────────
const API_KEY    = 'ffQVtHwaJuxMpAbvhCfJjUvrqC6ogIAC';
const API_SECRET = 'lBYj0gx0jIp1Ck3u';
const BASE       = 'https://api.onegov.nsw.gov.au';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function getNSWToken(): Promise<string> {
  // Return cached token if still valid (refresh 30s before expiry)
  if (cachedToken && Date.now() < tokenExpiry - 30_000) {
    return cachedToken;
  }

  const credentials = btoa(`${API_KEY}:${API_SECRET}`);

  const res = await fetch(
    `${BASE}/oauth/client_credential/accesstoken?grant_type=client_credentials`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/json',
      },
    }
  );

  const text = await res.text();

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Token parse failed (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }

  if (!data.access_token) {
    throw new Error(`No token in response: ${JSON.stringify(data).slice(0, 300)}`);
  }

  cachedToken  = data.access_token;
  // expires_in is in seconds; default 43200 = 12 hours
  tokenExpiry  = Date.now() + (Number(data.expires_in) || 43200) * 1000;
  return cachedToken;
}

export const NSW_FUEL_CODES: Record<string, string> = {
  'Unleaded 91': 'U91',
  'E10':         'E10',
  'Diesel':      'DL',
  'Unleaded 95': 'P95',
  'Unleaded 98': 'P98',
};

export async function fetchNSWNearby(
  lat: number,
  lng: number,
  radiusKm: number,
  fuelCode: string,
  maxResults: number = 25
): Promise<any> {
  const token = await getNSWToken();

  const res = await fetch(
    `${BASE}/FuelPriceCheck/v2/fuel/prices/nearby`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json; charset=utf-8',
        'apikey':        API_KEY,
        'requesttimestamp': new Date().toISOString().replace('T', ' ').substring(0, 19),
        'transactionid': Math.random().toString(36).substring(2, 18),
      },
      body: JSON.stringify({
        fueltype:   fuelCode,
        latitude:   String(lat),
        longitude:  String(lng),
        radius:     String(radiusKm),
        maxresults: String(maxResults),
      }),
    }
  );

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Response parse failed (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
}
