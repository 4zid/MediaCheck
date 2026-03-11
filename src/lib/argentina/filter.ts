/**
 * Strict filtering for Argentine news — blacklist/whitelist scoring.
 */

const BLACKLIST_KEYWORDS = [
  // Farandula y espectaculos
  'gran hermano', 'showmatch', 'bailando', 'cantando', 'tinelli',
  'wanda', 'icardi', 'china suárez', 'china suarez', 'pampita',
  'yanina latorre', 'ángel de brito', 'angel de brito', 'lam',
  'intrusos', 'farándula', 'farandula', 'celebrity', 'reality',
  'rating', 'novela', 'netflix', 'streaming', 'alfombra roja',
  'separación', 'separacion', 'romance', 'escándalo mediático',
  // Deportes
  'gol de', 'campeonato', 'liga profesional', 'copa argentina',
  'boca juniors', 'river plate', 'racing club', 'independiente',
  'san lorenzo', 'champions league', 'premier league', 'la liga',
  'nba', 'tenis', 'fórmula 1', 'formula 1', 'rugby', 'mundial sub',
  // Salud lifestyle
  'receta de', 'dieta', 'fitness', 'yoga', 'meditación', 'meditacion',
  'horóscopo', 'horoscopo', 'signo', 'astrología', 'astrologia',
  'bienestar', 'nutrición', 'nutricion', 'dermatología', 'estética',
  // Policiales comunes
  'choque fatal', 'accidente de tránsito', 'accidente de transito',
  'entradera', 'motochorro',
  // Otros irrelevantes
  'viral', 'tendencia tiktok', 'meme', 'challenge',
  'black friday', 'hot sale', 'cyber monday', 'receta de cocina',
  'pronóstico del tiempo', 'pronostico del tiempo', 'alerta meteorológica',
];

type ARCategory = 'politics' | 'economy' | 'justice' | 'social' | 'other';

interface WhitelistEntry {
  keyword: string;
  category: ARCategory;
  weight: number;
}

const WHITELIST: WhitelistEntry[] = [
  // Politica — figuras
  ...['milei', 'villarruel', 'francos', 'caputo', 'bullrich', 'petri',
    'kicillof', 'cristina', 'macri', 'massa', 'larreta'].map(kw => ({ keyword: kw, category: 'politics' as ARCategory, weight: 12 })),
  // Politica — instituciones y conceptos
  ...['gobierno', 'congreso', 'senado', 'diputados', 'dnu', 'decreto',
    'ley bases', 'presupuesto', 'veto', 'la libertad avanza',
    'juntos por el cambio', 'unión por la patria', 'union por la patria',
    'peronismo', 'kirchnerismo', 'casa rosada', 'gobernador',
    'elecciones', 'legislativas', 'candidato', 'reforma',
    'ministerio', 'funcionario', 'renuncia', 'cancillería', 'cancilleria',
    'embajador'].map(kw => ({ keyword: kw, category: 'politics' as ARCategory, weight: 10 })),

  // Economia
  ...['dólar', 'dolar', 'blue', 'mep', 'ccl', 'brecha cambiaria',
    'inflación', 'inflacion', 'ipc', 'indec', 'bcra', 'banco central',
    'reservas', 'fmi', 'deuda externa', 'riesgo país', 'riesgo pais',
    'tarifas', 'subsidios', 'ajuste', 'déficit', 'deficit', 'superávit', 'superavit',
    'recesión', 'recesion', 'pbi', 'desempleo', 'pobreza',
    'jubilaciones', 'anses', 'salario mínimo', 'salario minimo', 'paritarias',
    'impuesto', 'ganancias', 'retenciones', 'cepo', 'devaluación', 'devaluacion',
    'ypf', 'vaca muerta', 'litio', 'mercosur', 'exportaciones'].map(kw => ({ keyword: kw, category: 'economy' as ARCategory, weight: 10 })),

  // Justicia
  ...['corte suprema', 'comodoro py', 'tribunal', 'fiscal',
    'juez', 'jueza', 'procesado', 'imputado', 'causa judicial',
    'corrupción', 'corrupcion', 'lavado de dinero', 'soborno',
    'derechos humanos', 'desaparecidos', 'constitucional', 'amparo',
    'reforma judicial', 'consejo de la magistratura'].map(kw => ({ keyword: kw, category: 'justice' as ARCategory, weight: 10 })),

  // Social
  ...['protesta', 'marcha', 'piquete', 'movilización', 'movilizacion',
    'sindicato', 'cgt', 'cta', 'gremio', 'huelga', 'paro',
    'universidad', 'uba', 'educación pública', 'educacion publica', 'recorte',
    'movimiento social', 'plan social', 'comedor',
    'inseguridad', 'narcotráfico', 'narcotrafico'].map(kw => ({ keyword: kw, category: 'social' as ARCategory, weight: 10 })),
];

const CREDIBLE_AR_SOURCES = [
  'chequeado', 'lanacion', 'la nacion', 'clarin', 'infobae',
  'pagina12', 'pagina 12', 'ambito', 'cronista', 'reuters', 'bbc', 'telam',
];

export interface ScoredArticle {
  title: string;
  content: string;
  url: string;
  source: string;
  pubDate: string;
  relevanceScore: number;
  category: ARCategory;
  passesFilter: boolean;
}

/**
 * Score and filter an article for Argentine political/economic relevance.
 */
export function scoreArticle(
  title: string,
  content: string,
  url: string,
  source: string,
  pubDate: string,
): ScoredArticle {
  const text = `${title} ${content}`.toLowerCase();

  // 1. Blacklist — immediate reject
  const blacklisted = BLACKLIST_KEYWORDS.some(kw => text.includes(kw));
  if (blacklisted) {
    return { title, content, url, source, pubDate, relevanceScore: 0, category: 'other', passesFilter: false };
  }

  // 2. Whitelist scoring
  let score = 0;
  const categoryHits: Record<ARCategory, number> = { politics: 0, economy: 0, justice: 0, social: 0, other: 0 };

  for (const entry of WHITELIST) {
    if (text.includes(entry.keyword)) {
      score += entry.weight;
      categoryHits[entry.category] += entry.weight;
    }
  }

  // 3. Source credibility bonus
  const sourceLower = source.toLowerCase();
  if (CREDIBLE_AR_SOURCES.some(s => sourceLower.includes(s))) {
    score += 15;
  }

  // 4. Determine category
  const topCategory = (Object.entries(categoryHits) as [ARCategory, number][])
    .filter(([cat]) => cat !== 'other')
    .sort(([, a], [, b]) => b - a)[0];

  const category: ARCategory = topCategory && topCategory[1] > 0 ? topCategory[0] : 'other';

  // 5. Threshold: needs at least 20 points
  const passesFilter = score >= 20;

  return {
    title, content, url, source, pubDate,
    relevanceScore: Math.min(score, 100),
    category,
    passesFilter,
  };
}

/**
 * Filter and score a batch of articles.
 */
export function filterArticles(
  articles: Array<{ title: string; content: string; url: string; source: string; pubDate: string }>
): ScoredArticle[] {
  return articles
    .map(a => scoreArticle(a.title, a.content, a.url, a.source, a.pubDate))
    .filter(a => a.passesFilter)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}
