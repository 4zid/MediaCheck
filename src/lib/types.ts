export type ClaimCategory =
  | 'politics'
  | 'health'
  | 'technology'
  | 'economy'
  | 'environment'
  | 'social'
  | 'science'
  | 'entertainment'
  | 'other';

export type VerdictType =
  | 'verified'
  | 'partially_true'
  | 'false'
  | 'unverified'
  | 'misleading';

export type SourceType = 'rss' | 'newsapi' | 'twitter' | 'manual' | 'url';

export interface Claim {
  id: string;
  content: string;
  source_url: string | null;
  source_type: SourceType;
  category: ClaimCategory;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  verification?: Verification;
}

export interface Verification {
  id: string;
  claim_id: string;
  verdict: VerdictType;
  confidence: number;
  summary: string;
  analysis: string;
  ai_model: string;
  created_at: string;
  sources?: VerificationSource[];
}

export interface VerificationSource {
  id: string;
  verification_id: string;
  url: string;
  title: string | null;
  snippet: string | null;
  credibility_score: number;
  supports_claim: boolean;
  source_name: string | null;
  accessed_at: string;
}

export interface ClaimWithVerification extends Claim {
  verification: Verification & {
    sources: VerificationSource[];
  };
}

export interface FactCheckResult {
  verdict: VerdictType;
  confidence: number;
  summary: string;
  analysis: string;
  sources: {
    url: string;
    title: string;
    snippet: string;
    credibility_score: number;
    supports_claim: boolean;
    source_name: string;
  }[];
}

export interface FeedItem {
  title: string;
  link: string;
  content: string;
  pubDate: string;
  source: string;
  sourceType: SourceType;
}

export const CATEGORIES: { value: ClaimCategory; label: string; emoji: string }[] = [
  { value: 'politics', label: 'Politica', emoji: '🏛️' },
  { value: 'health', label: 'Salud', emoji: '🏥' },
  { value: 'technology', label: 'Tecnologia', emoji: '💻' },
  { value: 'economy', label: 'Economia', emoji: '📈' },
  { value: 'environment', label: 'Medio Ambiente', emoji: '🌍' },
  { value: 'social', label: 'Social', emoji: '👥' },
  { value: 'science', label: 'Ciencia', emoji: '🔬' },
  { value: 'entertainment', label: 'Entretenimiento', emoji: '🎬' },
  { value: 'other', label: 'Otros', emoji: '📌' },
];

export const VERDICT_CONFIG: Record<VerdictType, { label: string; color: string; bg: string; icon: string }> = {
  verified: { label: 'Verificado', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40', icon: '✓' },
  partially_true: { label: 'Parcialmente Cierto', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40', icon: '~' },
  false: { label: 'Falso', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40', icon: '✗' },
  unverified: { label: 'No Verificado', color: 'text-gray-700 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800', icon: '?' },
  misleading: { label: 'Engañoso', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/40', icon: '!' },
};
