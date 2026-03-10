-- MediaCheck Database Schema

-- Enums
CREATE TYPE claim_category AS ENUM (
  'politics', 'health', 'technology', 'economy',
  'environment', 'social', 'science', 'entertainment', 'other'
);

CREATE TYPE verdict_type AS ENUM (
  'verified', 'partially_true', 'false', 'unverified', 'misleading'
);

CREATE TYPE source_type AS ENUM (
  'rss', 'newsapi', 'twitter', 'manual', 'url'
);

-- Claims table
CREATE TABLE claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  source_url TEXT,
  source_type source_type NOT NULL DEFAULT 'manual',
  category claim_category NOT NULL DEFAULT 'other',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verifications table
CREATE TABLE verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  verdict verdict_type NOT NULL,
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  summary TEXT NOT NULL,
  analysis TEXT NOT NULL,
  ai_model TEXT DEFAULT 'claude-sonnet-4-5-20250929',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification sources table
CREATE TABLE verification_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_id UUID REFERENCES verifications(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  snippet TEXT,
  credibility_score INTEGER CHECK (credibility_score >= 0 AND credibility_score <= 100),
  supports_claim BOOLEAN,
  source_name TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_claims_category ON claims(category);
CREATE INDEX idx_claims_created ON claims(created_at DESC);
CREATE INDEX idx_verifications_claim ON verifications(claim_id);
CREATE INDEX idx_verifications_verdict ON verifications(verdict);

-- RLS
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read claims" ON claims FOR SELECT USING (true);
CREATE POLICY "Public read verifications" ON verifications FOR SELECT USING (true);
CREATE POLICY "Public read sources" ON verification_sources FOR SELECT USING (true);
CREATE POLICY "Auth insert claims" ON claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service insert verifications" ON verifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert sources" ON verification_sources FOR INSERT WITH CHECK (true);
