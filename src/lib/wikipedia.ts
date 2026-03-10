/**
 * Wikipedia API — no key, no registration, no practical limits.
 * Useful for verifying factual data (dates, people, events).
 */

export async function searchWikipedia(query: string): Promise<{ title: string; extract: string }[]> {
  try {
    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: query,
      format: 'json',
      srlimit: '3',
      origin: '*',
    });

    const res = await fetch(
      `https://es.wikipedia.org/w/api.php?${params}`,
      { next: { revalidate: 600 } }
    );

    if (!res.ok) return [];

    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.query?.search || []).map((r: any) => ({
      title: r.title,
      extract: (r.snippet || '').replace(/<[^>]+>/g, '').substring(0, 300),
    }));
  } catch {
    console.error('Failed to search Wikipedia');
    return [];
  }
}

export async function getWikipediaSummary(title: string): Promise<{ title: string; extract: string } | null> {
  try {
    const res = await fetch(
      `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { next: { revalidate: 600 } }
    );

    if (!res.ok) return null;

    const data = await res.json();
    return {
      title: data.title,
      extract: (data.extract || '').substring(0, 500),
    };
  } catch {
    return null;
  }
}
