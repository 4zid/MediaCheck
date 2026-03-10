import type { ContextualSource } from './types';

interface EONETEvent {
  id: string;
  title: string;
  link: string;
  categories: Array<{ title: string }>;
}

export async function searchNASAEONET(claim: string): Promise<ContextualSource[]> {
  const res = await fetch(
    'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=10',
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return [];

  const json = await res.json();
  const events = json.events as EONETEvent[];
  if (!Array.isArray(events)) return [];

  const keywords = claim.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

  return events
    .filter((ev) => {
      const text = `${ev.title} ${ev.categories.map((c) => c.title).join(' ')}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw));
    })
    .slice(0, 5)
    .map((ev) => ({
      title: `[NASA EONET] ${ev.title}`,
      url: ev.link || `https://eonet.gsfc.nasa.gov/api/v3/events/${ev.id}`,
      content: `Active natural event: ${ev.title}. Categories: ${ev.categories.map((c) => c.title).join(', ')}.`,
    }));
}
