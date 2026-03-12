# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server**: `npm run dev` (port 3000)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Deploy**: `npx vercel --prod` (force-deploy: `npx vercel --prod --force`)

No test framework is configured.

## Architecture

MediaCheck is a Spanish-language AI fact-checking app. Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Supabase (PostgreSQL).

### Verification Pipeline (`src/app/api/verify-stream/route.ts`)

The core is a 7-step SSE streaming pipeline that progressively filters claims to minimize Claude token usage:

1. **ClaimBuster** — scores claim verifiability (0-1). Score < 0.3 → early exit (opinion).
2. **Google Fact Check** — queries ClaimReview DB. If match found → short-circuit with cached result.
3. **Haiku classification** — `claude-haiku-4-5-20251001` returns `{verifiable, category, urgency}`. Not verifiable → early exit.
4. **Parallel source search** — RSS feeds, NewsAPI, GNews, GDELT, Bluesky, Wikipedia, plus category-routed contextual APIs (USGS, WHO, GDACS, NASA EONET, ReliefWeb, Open-Meteo). All run via `Promise.all()`.
5. **Sonnet analysis** — `claude-sonnet-4-6` deep analysis with collected sources. Returns verdict, confidence, summary, analysis.
6. **Supabase persist** — stores claim, verification, and sources.
7. **Stream complete** — sends final SSE event with `claimId`.

### Investigation System

The app operates as a real-time investigation dashboard. A Vercel cron (`/api/cron/investigate`, daily at 8am) runs `manageCases()` to maintain up to 3 active AI-curated investigation cases, then re-checks each via Sonnet analysis.

- `GET /api/investigations` — returns active + recent resolved cases. Auto-calls `manageCases()` if no active cases exist.
- `POST /api/investigations/[id]/recheck` — manual re-investigation (one-time per case)
- `GET /api/cron/investigate` — cron endpoint (protected by `CRON_SECRET`)

**Case Manager flow** (`src/lib/argentina/case-manager.ts`):
1. Auto-purges legacy irrelevant cases (blacklisted keywords in title)
2. Archives stale cases (24h+ no update, or 72h+ old with <30% confidence)
3. Fetches Argentine news feeds + Google Trends in parallel
4. Filters articles through blacklist/whitelist scoring (`src/lib/argentina/filter.ts`, threshold ≥20 points)
5. Clusters articles by keyword overlap, boosts clusters matching Google Trends
6. Asks Haiku per cluster: OPEN_CASE or REJECT. Haiku must create "Caso: [investigative framing]" titles — never copy headlines
7. Creates investigation with sources; adds economic context for economy cases

**Critical**: API routes that query Supabase MUST export `fetchCache = 'force-no-store'` — Next.js 14 caches `fetch()` calls by default, causing stale Supabase data even with `force-dynamic`.

### Contextual API Router (`src/lib/contextual/index.ts`)

`resolveContextualAPIs(category, urgency, claim)` selects 0-3 specialized APIs based on bilingual (ES+EN) keyword matching against the claim text plus Haiku's classification. Generic claims (politics, economy) skip contextual APIs entirely.

### Key Modules

| Module | Purpose |
|--------|---------|
| `src/lib/claude.ts` | Anthropic SDK calls (Haiku classifier + Sonnet fact-checker). Has 4-level JSON parsing fallback for truncated responses. |
| `src/lib/feeds.ts` | `searchSources()` aggregates RSS, NewsAPI, GNews, GDELT, Bluesky. Returns `{title, url, content, date?}[]`. |
| `src/lib/sources.ts` | `getCredibilityScore(url)` maps domains to 0-100 scores. |
| `src/lib/googleFactCheck.ts` | Google Fact Check Tools API wrapper. |
| `src/lib/wikipedia.ts` | Spanish Wikipedia search. |
| `src/lib/claimbuster.ts` | ClaimBuster API for verifiability scoring. |
| `src/hooks/useVerification.ts` | Client-side SSE stream consumer with step tracking. |
| `src/lib/investigations.ts` | `recheckInvestigation()`, `getActiveInvestigations()`, `seedInvestigations()`. Note: `detectAndCreateCases()` was removed — `manageCases()` in case-manager.ts replaced it. |
| `src/lib/argentina/case-manager.ts` | `manageCases()` — maintains up to 3 active investigations via Haiku decisions. |
| `src/lib/argentina/filter.ts` | `scoreArticle()` / `filterArticles()` — blacklist/whitelist scoring for Argentine news relevance. |
| `src/lib/argentina/trends.ts` | `fetchGoogleTrendsAR()` — free Google Trends RSS for Argentina (no API key). |
| `src/lib/argentina/feeds.ts` | Argentine RSS (Infobae, Clarin, La Nacion, P12, Ambito, Chequeado) + GDELT AR + GNews AR + NewsAPI AR. Auto-categorizes into politics/economy/justice/social. |
| `src/lib/argentina/economic.ts` | DolarAPI + ArgentinaDatos: dollar rates (blue, oficial, MEP, CCL) and inflation data. No API keys. |

### Database Schema (Supabase)

**Original tables**: `claims`, `verifications`, `verification_sources`.

**Investigation tables** (migration: `supabase/migrations/001_investigations.sql`):
- `investigations` (title, summary, status, verdict, confidence, category, manual_recheck_used, source_count)
- `investigation_sources` (url, title, snippet, content, credibility_score, supports_claim, source_type, published_at) — UNIQUE(investigation_id, url)
- `investigation_checks` (verdict, confidence, summary, analysis, sources_added, ai_model)

### UI & Theme System

Custom components (no shadcn/MUI). Glassmorphism design with dark/light mode support. Manrope for headlines, DM Sans for body. Accent color: violet (#8b5cf6). All UI strings are in Spanish.

**Theme architecture**: `useTheme` hook toggles `.dark` class on `<html>`. An inline `<script>` in layout.tsx prevents flash by reading localStorage before hydration. CSS custom properties in `globals.css` define both light and dark values (`--background`, `--foreground`, `--glass-bg`, `--border-color`, etc.).

**Color tokens in Tailwind**: Use `text-fg/[opacity]`, `bg-fg/[opacity]`, `border-fg/[opacity]` for theme-aware foreground colors (white in dark, dark in light). `surface` and `wire` colors also adapt via CSS variables. **Never use hardcoded `text-white/` or `bg-white/`** — always use `fg` instead.

Glass component classes (`.glass`, `.glass-hover`, `.glass-accent`) are defined in `globals.css` using CSS custom properties that auto-switch with theme.

## Path Alias

`@/*` maps to `./src/*` (tsconfig paths).

## Environment Variables

Required: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
Optional (graceful degradation if missing): `NEWS_API_KEY`, `GOOGLE_FACT_CHECK_API_KEY`, `CLAIMBUSTER_API_KEY`, `GNEWS_API_KEY`, `TWITTER_BEARER_TOKEN`, `CRON_SECRET`.

## Conventions

- All external API calls use `.catch(() => [])` for graceful failure.
- Source search functions return `{title: string, url: string, content: string, date?: string}[]`.
- `rss-parser` is configured as a server-side external package in `next.config.mjs`.
- Verdicts: `verified`, `partially_true`, `false`, `unverified`, `misleading`.
- Categories: `politics`, `health`, `technology`, `economy`, `environment`, `social`, `science`, `entertainment`, `other`.
- Function max duration is 60 seconds (set in verify-stream and cron routes).
- Investigation case titles MUST start with "Caso:" and be AI-generated investigative framings, never copied headlines.
- API routes querying Supabase must export both `dynamic = 'force-dynamic'` and `fetchCache = 'force-no-store'`.
