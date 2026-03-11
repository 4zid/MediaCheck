import type { ContextualSource } from './types';

interface USGSFeature {
  properties: {
    title: string;
    url: string;
    mag: number;
    place: string;
    time: number;
  };
}

export async function searchUSGS(): Promise<ContextualSource[]> {
  const res = await fetch(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson',
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return [];

  const json = await res.json();
  const features = json.features as USGSFeature[];
  if (!Array.isArray(features)) return [];

  return features.slice(0, 5).map((f) => ({
    title: `[USGS] ${f.properties.title}`,
    url: f.properties.url,
    content: `Magnitude ${f.properties.mag} earthquake at ${f.properties.place}. Recorded ${new Date(f.properties.time).toISOString().slice(0, 10)}.`,
    date: new Date(f.properties.time).toISOString(),
  }));
}
