/**
 * ClaimBuster API — scores how "checkable" a claim is (0 to 1).
 * Filters out opinion statements to save Claude tokens.
 * Free for academic/research use.
 */

export interface ClaimScore {
  text: string;
  score: number;
}

export async function scoreClaim(text: string): Promise<ClaimScore[]> {
  const apiKey = process.env.CLAIMBUSTER_API_KEY;

  // If no key, skip scoring and assume claim is checkable
  if (!apiKey) return [{ text, score: 0.7 }];

  try {
    const res = await fetch(
      `https://idir.uta.edu/claimbuster/api/v2/score/text/${encodeURIComponent(text)}`,
      {
        headers: { 'x-api-key': apiKey },
      }
    );

    if (!res.ok) return [{ text, score: 0.7 }];

    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.results || []).map((r: any) => ({
      text: r.text || text,
      score: r.score ?? 0.5,
    }));
  } catch {
    console.error('ClaimBuster API failed');
    return [{ text, score: 0.7 }];
  }
}
