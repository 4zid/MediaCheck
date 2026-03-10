import type { ContextualSource, ContextualAPIKey } from './types';
import { searchReliefWeb } from './reliefweb';
import { searchGDACS } from './gdacs';
import { searchUSGS } from './usgs';
import { searchNASAEONET } from './nasa-eonet';
import { searchWHO } from './who';
import { searchOpenMeteo } from './open-meteo';

// Keyword → API routing rules (bilingual ES+EN)
const KEYWORD_ROUTES: { keywords: string[]; apis: ContextualAPIKey[] }[] = [
  {
    keywords: ['terremoto', 'sismo', 'earthquake', 'seismic'],
    apis: ['usgs'],
  },
  {
    keywords: ['desastre', 'inundacion', 'inundación', 'ciclon', 'ciclón', 'volcan', 'volcán', 'incendio', 'disaster', 'flood', 'hurricane', 'wildfire', 'tsunami', 'tormenta', 'storm'],
    apis: ['gdacs', 'nasa-eonet'],
  },
  {
    keywords: ['humanitario', 'refugiado', 'crisis humanitaria', 'humanitarian', 'refugee', 'displaced'],
    apis: ['reliefweb'],
  },
  {
    keywords: ['brote', 'epidemia', 'pandemia', 'virus', 'enfermedad', 'outbreak', 'disease', 'epidemic', 'pandemic', 'contagio', 'infección', 'infeccion'],
    apis: ['who', 'reliefweb'],
  },
  {
    keywords: ['calidad del aire', 'contaminacion', 'contaminación', 'pollution', 'air quality', 'smog', 'pm2.5', 'pm10'],
    apis: ['open-meteo'],
  },
];

/**
 * Pure function: determines which contextual APIs to query based on
 * the Haiku classification and claim keywords. Returns 0-3 API keys.
 */
export function resolveContextualAPIs(
  category: string,
  urgency: string,
  claim: string,
): ContextualAPIKey[] {
  const lower = claim.toLowerCase();
  const matched = new Set<ContextualAPIKey>();

  // Keyword-based routing
  for (const route of KEYWORD_ROUTES) {
    if (route.keywords.some((kw) => lower.includes(kw))) {
      for (const api of route.apis) matched.add(api);
    }
  }

  // High urgency + environment/science → add disaster APIs
  if (
    urgency === 'high' &&
    (category === 'environment' || category === 'science') &&
    matched.size === 0
  ) {
    matched.add('gdacs');
    matched.add('nasa-eonet');
  }

  // Cap at 3 APIs to avoid latency
  return Array.from(matched).slice(0, 3);
}

// API key → search function mapping
const API_RUNNERS: Record<ContextualAPIKey, (claim: string) => Promise<ContextualSource[]>> = {
  reliefweb: (claim) => searchReliefWeb(claim),
  gdacs: (claim) => searchGDACS(claim),
  usgs: () => searchUSGS(),
  'nasa-eonet': (claim) => searchNASAEONET(claim),
  who: (claim) => searchWHO(claim),
  'open-meteo': (claim) => searchOpenMeteo(claim),
};

/**
 * Runs matched contextual APIs in parallel. Returns max 5 sources.
 */
export async function searchContextualSources(
  category: string,
  urgency: string,
  claim: string,
): Promise<ContextualSource[]> {
  const apis = resolveContextualAPIs(category, urgency, claim);
  if (apis.length === 0) return [];

  const results = await Promise.all(
    apis.map((key) => API_RUNNERS[key](claim).catch(() => [] as ContextualSource[])),
  );

  return results.flat().slice(0, 5);
}

export type { ContextualSource, ContextualAPIKey } from './types';
