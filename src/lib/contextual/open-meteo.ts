import type { ContextualSource } from './types';

// Major cities with coordinates for air quality lookups
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  'buenos aires': { lat: -34.61, lon: -58.38 },
  'ciudad de mexico': { lat: 19.43, lon: -99.13 },
  'mexico city': { lat: 19.43, lon: -99.13 },
  'bogota': { lat: 4.71, lon: -74.07 },
  'lima': { lat: -12.05, lon: -77.04 },
  'santiago': { lat: -33.45, lon: -70.67 },
  'madrid': { lat: 40.42, lon: -3.70 },
  'barcelona': { lat: 41.39, lon: 2.17 },
  'london': { lat: 51.51, lon: -0.13 },
  'londres': { lat: 51.51, lon: -0.13 },
  'paris': { lat: 48.86, lon: 2.35 },
  'berlin': { lat: 52.52, lon: 13.41 },
  'rome': { lat: 41.90, lon: 12.50 },
  'roma': { lat: 41.90, lon: 12.50 },
  'new york': { lat: 40.71, lon: -74.01 },
  'nueva york': { lat: 40.71, lon: -74.01 },
  'los angeles': { lat: 34.05, lon: -118.24 },
  'washington': { lat: 38.91, lon: -77.04 },
  'tokyo': { lat: 35.68, lon: 139.69 },
  'tokio': { lat: 35.68, lon: 139.69 },
  'beijing': { lat: 39.90, lon: 116.41 },
  'pekin': { lat: 39.90, lon: 116.41 },
  'shanghai': { lat: 31.23, lon: 121.47 },
  'delhi': { lat: 28.61, lon: 77.21 },
  'nueva delhi': { lat: 28.61, lon: 77.21 },
  'mumbai': { lat: 19.08, lon: 72.88 },
  'sydney': { lat: -33.87, lon: 151.21 },
  'cairo': { lat: 30.04, lon: 31.24 },
  'el cairo': { lat: 30.04, lon: 31.24 },
  'lagos': { lat: 6.52, lon: 3.38 },
  'nairobi': { lat: -1.29, lon: 36.82 },
  'sao paulo': { lat: -23.55, lon: -46.63 },
  'rio de janeiro': { lat: -22.91, lon: -43.17 },
  'johannesburg': { lat: -26.20, lon: 28.05 },
  'moscow': { lat: 55.76, lon: 37.62 },
  'moscu': { lat: 55.76, lon: 37.62 },
  'istanbul': { lat: 41.01, lon: 28.98 },
  'estambul': { lat: 41.01, lon: 28.98 },
  'seoul': { lat: 37.57, lon: 126.98 },
  'seul': { lat: 37.57, lon: 126.98 },
  'bangkok': { lat: 13.76, lon: 100.50 },
  'jakarta': { lat: -6.21, lon: 106.85 },
  'manila': { lat: 14.60, lon: 120.98 },
  'singapore': { lat: 1.35, lon: 103.82 },
  'singapur': { lat: 1.35, lon: 103.82 },
  'dubai': { lat: 25.20, lon: 55.27 },
  'toronto': { lat: 43.65, lon: -79.38 },
  'monterrey': { lat: 25.67, lon: -100.31 },
  'medellin': { lat: 6.25, lon: -75.56 },
  'quito': { lat: -0.18, lon: -78.47 },
  'caracas': { lat: 10.48, lon: -66.90 },
  'la paz': { lat: -16.49, lon: -68.12 },
  'montevideo': { lat: -34.88, lon: -56.16 },
  'cordoba': { lat: -31.42, lon: -64.18 },
  'rosario': { lat: -32.95, lon: -60.65 },
};

function findCity(claim: string): { name: string; lat: number; lon: number } | null {
  const lower = claim.toLowerCase();
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (lower.includes(city)) {
      return { name: city, ...coords };
    }
  }
  return null;
}

interface AirQualityResponse {
  current: {
    european_aqi: number;
    pm10: number;
    pm2_5: number;
  };
}

function aqiLabel(aqi: number): string {
  if (aqi <= 20) return 'Good';
  if (aqi <= 40) return 'Fair';
  if (aqi <= 60) return 'Moderate';
  if (aqi <= 80) return 'Poor';
  if (aqi <= 100) return 'Very Poor';
  return 'Extremely Poor';
}

export async function searchOpenMeteo(claim: string): Promise<ContextualSource[]> {
  const city = findCity(claim);
  if (!city) return [];

  const res = await fetch(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=european_aqi,pm10,pm2_5`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return [];

  const data: AirQualityResponse = await res.json();
  if (!data.current) return [];

  const { european_aqi, pm10, pm2_5 } = data.current;

  return [{
    title: `[Open-Meteo] Air Quality in ${city.name}`,
    url: `https://open-meteo.com/`,
    content: `Current air quality in ${city.name}: European AQI ${european_aqi} (${aqiLabel(european_aqi)}). PM10: ${pm10} µg/m³, PM2.5: ${pm2_5} µg/m³.`,
    date: new Date().toISOString(),
  }];
}
