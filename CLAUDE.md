# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server**: `npm run dev` (port 3000)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Deploy**: `npx vercel --prod`

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
| `src/lib/investigations.ts` | Investigation case logic: `detectAndCreateCases()`, `recheckInvestigation()`, `getActiveInvestigations()`. |

### Investigation System

The app operates as a real-time investigation dashboard. A Vercel cron (`/api/cron/investigate`, every 5 min) detects trending news, creates investigation cases (max 3 active), and periodically re-checks them accumulating sources over time.

- `GET /api/investigations` — returns active + recent resolved cases
- `POST /api/investigations/[id]/recheck` — manual re-investigation (one-time per case)
- `GET /api/cron/investigate` — cron endpoint (protected by `CRON_SECRET`)

### Database Schema (Supabase)

**Original tables**: `claims`, `verifications`, `verification_sources`.

**Investigation tables** (migration: `supabase/migrations/001_investigations.sql`):
- `investigations` (title, summary, status, verdict, confidence, category, manual_recheck_used, source_count)
- `investigation_sources` (url, title, snippet, content, credibility_score, supports_claim, source_type, published_at) — UNIQUE(investigation_id, url)
- `investigation_checks` (verdict, confidence, summary, analysis, sources_added, ai_model)

### UI

Custom components (no shadcn/MUI). Dark-mode-first with glassmorphism. Manrope for headlines, DM Sans for body. Accent color: violet (#8b5cf6). All UI strings are in Spanish.

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
- Function max duration is 60 seconds (set in verify-stream route).
