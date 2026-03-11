// Known credible fact-checking and news sources with credibility scores
const CREDIBLE_SOURCES: Record<string, number> = {
  'reuters.com': 95,
  'apnews.com': 95,
  'bbc.com': 90,
  'bbc.co.uk': 90,
  'nytimes.com': 88,
  'washingtonpost.com': 87,
  'theguardian.com': 86,
  'elpais.com': 85,
  'nature.com': 95,
  'science.org': 95,
  'who.int': 92,
  'cdc.gov': 92,
  'snopes.com': 90,
  'factcheck.org': 92,
  'politifact.com': 90,
  'maldita.es': 88,
  'newtral.es': 88,
  'chequeado.com': 88,
  'verificado.mx': 86,
  // Argentine media
  'infobae.com': 78,
  'clarin.com': 76,
  'lanacion.com.ar': 80,
  'pagina12.com.ar': 72,
  'ambito.com': 74,
  'telam.com.ar': 75,
  'perfil.com': 72,
  'cronista.com': 76,
  'c5n.com': 65,
  'tn.com.ar': 70,
  'reliefweb.int': 92,
  'gdacs.org': 88,
  'earthquake.usgs.gov': 95,
  'eonet.gsfc.nasa.gov': 93,
};

export function getCredibilityScore(url: string): number {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    // Check exact match first
    if (CREDIBLE_SOURCES[hostname]) return CREDIBLE_SOURCES[hostname];
    // Check partial match
    for (const [domain, score] of Object.entries(CREDIBLE_SOURCES)) {
      if (hostname.endsWith(domain)) return score;
    }
    // Default score for unknown sources
    return 50;
  } catch {
    return 30;
  }
}

export function isCredibleSource(url: string): boolean {
  return getCredibilityScore(url) >= 75;
}

export function getSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const parts = hostname.split('.');
    return parts.length > 2 ? parts.slice(-2, -1)[0] : parts[0];
  } catch {
    return 'Desconocido';
  }
}
