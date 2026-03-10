import type { ContextualSource } from './types';

export async function searchReliefWeb(query: string): Promise<ContextualSource[]> {
  const url = `https://api.reliefweb.int/v1/reports?appname=mediacheck&query[value]=${encodeURIComponent(query)}&limit=5&fields[include][]=title&fields[include][]=url&fields[include][]=body-html&fields[include][]=source`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];

  const json = await res.json();
  const data = json.data as Array<{ fields: { title: string; url: string; 'body-html'?: string; source?: Array<{ name: string }> } }>;
  if (!Array.isArray(data)) return [];

  return data.slice(0, 5).map((item) => ({
    title: `[ReliefWeb] ${item.fields.title}`,
    url: item.fields.url || '',
    content: stripHtml(item.fields['body-html'] || '').slice(0, 500),
  }));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
