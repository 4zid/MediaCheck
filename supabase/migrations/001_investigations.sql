-- Casos/investigaciones activas
CREATE TABLE investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
  verdict TEXT CHECK (verdict IN ('verified', 'partially_true', 'false', 'unverified', 'misleading')),
  confidence INTEGER DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  category TEXT DEFAULT 'other',
  manual_recheck_used BOOLEAN DEFAULT false,
  source_count INTEGER DEFAULT 0,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fuentes acumuladas por caso
CREATE TABLE investigation_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  snippet TEXT,
  content TEXT,
  credibility_score INTEGER DEFAULT 50,
  supports_claim BOOLEAN,
  source_name TEXT,
  source_type TEXT,
  published_at TIMESTAMPTZ,
  accessed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(investigation_id, url)
);

-- Historial de re-checks por caso
CREATE TABLE investigation_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
  verdict TEXT,
  confidence INTEGER,
  summary TEXT,
  analysis TEXT,
  sources_added INTEGER DEFAULT 0,
  ai_model TEXT DEFAULT 'claude-sonnet-4-6',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_investigations_status ON investigations(status);
CREATE INDEX idx_investigation_sources_inv ON investigation_sources(investigation_id);
CREATE INDEX idx_investigation_checks_inv ON investigation_checks(investigation_id);

-- RLS
ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigation_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigation_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read investigations" ON investigations FOR SELECT USING (true);
CREATE POLICY "Service insert investigations" ON investigations FOR ALL USING (true);
CREATE POLICY "Public read investigation_sources" ON investigation_sources FOR SELECT USING (true);
CREATE POLICY "Service insert investigation_sources" ON investigation_sources FOR ALL USING (true);
CREATE POLICY "Public read investigation_checks" ON investigation_checks FOR SELECT USING (true);
CREATE POLICY "Service insert investigation_checks" ON investigation_checks FOR ALL USING (true);
