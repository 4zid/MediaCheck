export interface GoogleFactCheckClaim {
  text: string;
  claimant?: string;
  claimDate?: string;
  claimReview: {
    publisher: { name: string; site?: string };
    url: string;
    title: string;
    reviewDate?: string;
    textualRating: string;
    languageCode: string;
  }[];
}

export interface GoogleFactCheckResult {
  claims: GoogleFactCheckClaim[];
}

/**
 * Query the Google Fact Check Tools API for existing fact-checks on a claim.
 * Requires GOOGLE_FACT_CHECK_API_KEY in environment variables.
 * Returns an empty result if the key is not set or the request fails.
 */
export async function queryGoogleFactCheck(query: string): Promise<GoogleFactCheckResult> {
  const apiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;

  if (!apiKey || apiKey === 'your-google-fact-check-api-key') {
    return { claims: [] };
  }

  try {
    const params = new URLSearchParams({
      query,
      key: apiKey,
      pageSize: '5',
      languageCode: 'es,en',
    });

    const res = await fetch(
      `https://factchecktools.googleapis.com/v1alpha1/claims:search?${params}`,
      { next: { revalidate: 600 } }
    );

    if (!res.ok) {
      console.error('Google Fact Check API error:', res.status, res.statusText);
      return { claims: [] };
    }

    const data = await res.json();
    return { claims: data.claims || [] };
  } catch (err) {
    console.error('Failed to query Google Fact Check API:', err);
    return { claims: [] };
  }
}

/**
 * Convert Google Fact Check results into the source format used by the verify route.
 */
export function googleClaimsToSources(
  claims: GoogleFactCheckClaim[]
): { title: string; url: string; content: string }[] {
  return claims.flatMap((claim) =>
    claim.claimReview.map((review) => ({
      title: review.title || claim.text,
      url: review.url,
      content: `[${review.publisher.name}] ${review.textualRating} — "${claim.text}"`,
    }))
  );
}
