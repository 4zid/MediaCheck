# /verify-trending — Escanear tendencias argentinas y verificar rumores polémicos

Scan Argentine trending topics and news feeds for controversial/rumor-laden content, present candidates, and verify selected ones through the Sonnet pipeline — storing results as investigations.

Arguments: $ARGUMENTS
- Pass `--auto` to skip interactive selection and auto-verify the top 3 candidates.

---

## Phase 1 — Fetch & Filter

Write and run a temporary TypeScript script via `npx tsx` that fetches trending topics and news, filters for relevance and polemic content, clusters by topic, and outputs a JSON file with candidates.

Create a file at `tmp-verify-trending-scan.ts` in the project root with the following logic:

**Environment setup** (MUST be first lines — before any other imports so env vars are available at module init):
```ts
import { config } from 'dotenv';
config({ path: '.env.local' });
```

**Imports** (use relative paths from project root, NOT `@/`):
- `fetchGoogleTrendsAR` from `./src/lib/argentina/trends`
- `fetchArgentinaFeed` from `./src/lib/argentina/feeds`
- `filterArticles, ScoredArticle` from `./src/lib/argentina/filter`

**Steps:**

1. Fetch in parallel: `fetchGoogleTrendsAR()` and `fetchArgentinaFeed(50)` — use 50 to get a broader pool
2. Map feed items to the format expected by `filterArticles`: `{ title, content, url: item.link, source, pubDate }`
3. Run `filterArticles()` (threshold ≥20 already built in)
4. Apply a **polemic pre-filter** on each passing article. Score the combined `title + content` (lowercased) using these keyword lists:

   **Controversy** (+5 each): `denuncia`, `escándalo`, `escandalo`, `polémica`, `polemica`, `acusación`, `acusacion`, `sospecha`, `cuestionan`, `cruce`, `tensión`, `tension`, `conflicto`, `enfrentamiento`, `disputa`, `investigación`, `investigacion`, `irregularidad`, `fraude`, `contra`, `rechazo`, `crítica`, `critica`, `alerta`, `crisis`

   **Rumor** (+7 each): `rumor`, `trascendió`, `trascendio`, `habría`, `habria`, `supuesto`, `presunto`, `desmienten`, `según fuentes`, `segun fuentes`, `versiones`, `off the record`, `podría`, `podria`, `especulan`

   **Verifiability** (+3 each): `aseguró`, `aseguro`, `afirmó`, `afirmo`, `denunció`, `denuncio`, `prometió`, `prometio`, `cifras`, `datos`, `porcentaje`, `millones`, `estadística`, `estadistica`, `anunció`, `anuncio`, `confirmó`, `confirmo`, `reveló`, `revelo`, `informó`, `informo`

   Attach `polemicScore` and `polemicReason` (list of matched keywords) to each article.

5. Cross-reference with trends: for each article, check if any trending topic keyword (words > 3 chars) appears in the article title. If so, set `trendMatch = true` and add +10 to the polemic score.

6. **Fallback logic**: If fewer than 3 articles have polemic score > 0, use ALL relevance-filtered articles sorted by `(polemicScore + relevanceScore)` descending. This ensures we always have candidates even when news is mild.

7. Cluster articles by keyword overlap (words > 4 chars in title, ≥2 shared words = same cluster). Sort clusters by size descending.

8. Take the top 7 clusters. For each cluster, output an object:
   ```json
   {
     "id": <1-based index>,
     "title": <first article title>,
     "source": <first article source>,
     "category": <first article category>,
     "articleCount": <cluster size>,
     "relevanceScore": <first article relevanceScore>,
     "polemicScore": <max polemic score in cluster>,
     "polemicReason": <merged polemic reasons>,
     "trendMatch": <true if any article matched a trend>,
     "articles": <all articles in cluster with url, title, source, content>
   }
   ```

9. Write the result as JSON to `tmp-verify-trending-candidates.json` and print a summary to stdout.

Wrap everything in try/catch. After running, **delete `tmp-verify-trending-scan.ts`**.

---

## Phase 2 — Present Candidates

Read `tmp-verify-trending-candidates.json` and present the candidates in a formatted Spanish-language table:

```
ESCANEO DE TENDENCIAS ARGENTINAS

#  | Tema                              | Fuente      | Cat.     | Polém. | Trend
---|-----------------------------------|-------------|----------|--------|------
1  | [title truncated to 35 chars]     | [source]    | politics | 12     | SI
2  | ...                               | ...         | ...      | ...    | -
...

Razones polémicas:
1. [polemicReason joined]
2. ...
```

**If `--auto` was passed in $ARGUMENTS**: Skip interaction. Select the top 3 candidates automatically (or all if fewer than 3). Print "Modo automático: verificando los principales candidatos..." and proceed to Phase 3.

**Otherwise**: Ask the user which candidates to verify. They can type numbers like `1,3,5` or `all` or `auto` (top 3). Wait for user response before proceeding.

---

## Phase 3 — Verify Selected Candidates

For each selected candidate, write and run a TypeScript script `tmp-verify-trending-check.ts`.

### CRITICAL: Module loading order

`src/lib/claude.ts` initializes the Anthropic SDK client at **module load time** reading `process.env.ANTHROPIC_API_KEY`. If you import it statically, dotenv hasn't run yet and the key is undefined.

**Solution**: Use dynamic `await import()` inside an async `main()` function:

```ts
import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  // Dynamic imports AFTER dotenv has loaded
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const { factCheck } = await import('./src/lib/claude');
  const { searchSources } = await import('./src/lib/feeds');
  const { searchWikipedia } = await import('./src/lib/wikipedia');
  const { createClient } = await import('@supabase/supabase-js');
  const { getCredibilityScore, getSourceName } = await import('./src/lib/sources');
  // ... rest of logic
}
main();
```

**The script receives candidate IDs as a comma-separated argument** (e.g., `npx tsx tmp-verify-trending-check.ts "1,2"`). It reads candidates from `tmp-verify-trending-candidates.json`.

**Steps per candidate:**

1. **Extract claim with Haiku**: Use the Anthropic SDK directly to ask `claude-haiku-4-5-20251001` to extract the core verifiable claim as a single declarative Spanish sentence from the article title + content. Prompt: "Del siguiente artículo, extraé el claim factual verificable principal como una oración declarativa en español. Respondé SOLO con el claim, sin comillas ni explicación.\n\nTítulo: {title}\nContenido: {content}"

2. **Search sources**: Run in parallel:
   - `searchSources(claim)` — multi-source search
   - `searchWikipedia(claim)` — returns `{title, extract}[]`, map to `{title, url: 'https://es.wikipedia.org/wiki/' + encodeURIComponent(title), content: extract}`
   Merge results into a single sources array.

3. **Sonnet analysis**: Call `factCheck(claim, sources)` which returns `{verdict, confidence, summary, analysis, category, sources}`.

4. **Generate case title**: Ask Haiku: "Generá un título investigativo para este caso. Formato exacto: 'Caso: [encuadre investigativo]'. NO copies el titular original. Sé breve. Claim: {claim}". Ensure result starts with "Caso:".

5. **Store in Supabase**: Create a Supabase client with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

   **IMPORTANT**: Supabase JS client returns `{ data, error }` — it does NOT throw on insert errors. Use `try/catch` around source inserts for safety, NOT `.catch()` chaining.

   a. Insert into `investigations`:
   ```
   {
     title: caseTitle.substring(0, 200),
     summary: result.summary,
     status: 'active',
     category: result.category,
     confidence: result.confidence,
     source_count: allSources.length,
     verdict: result.verdict,
   }
   ```

   b. Insert sources into `investigation_sources` (wrap each in try/catch):
   ```
   {
     investigation_id: inv.id,
     url: source.url,
     title: source.title,
     snippet: source.content?.substring(0, 300),
     content: source.content,
     credibility_score: getCredibilityScore(source.url),
     source_name: getSourceName(source.url),
     source_type: 'rss',
     published_at: source.date || null,
   }
   ```

   c. Insert into `investigation_checks`:
   ```
   {
     investigation_id: inv.id,
     verdict: result.verdict,
     confidence: result.confidence,
     summary: result.summary,
     analysis: result.analysis,
     sources_added: allSources.length,
     ai_model: 'claude-sonnet-4-6',
   }
   ```

6. **Output** the result as JSON to stdout.

After running, **delete `tmp-verify-trending-check.ts`**.

---

## Phase 4 — Summary

After all verifications complete, present a final Spanish-language summary:

```
VERIFICACIÓN COMPLETADA

Caso                                    | Veredicto        | Confianza
----------------------------------------|------------------|----------
Caso: [title]                           | Verificado       | 85%
Caso: [title]                           | Parcialmente     | 60%
Caso: [title]                           | No verificado    | 10%

Los casos han sido guardados en la base de datos y aparecerán en el panel de investigaciones.
```

Clean up: delete `tmp-verify-trending-candidates.json` if it still exists.

---

## Important Constraints

- Always load dotenv FIRST: `import { config } from 'dotenv'; config({ path: '.env.local' });`
- Use **dynamic imports** (`await import()`) for modules that read env vars at load time (especially `src/lib/claude.ts`)
- Use relative imports (`./src/lib/...`), never `@/` aliases (tsx doesn't resolve them)
- Supabase client returns `{ data, error }`, not promises that reject — use try/catch, not `.catch()`
- Wrap all API calls in try/catch — fail gracefully per candidate, don't abort the batch
- Investigation titles MUST start with "Caso:" and be AI-generated investigative framings
- All user-facing output must be in Spanish
- Delete all temporary files (`tmp-verify-trending-*.ts`, `tmp-verify-trending-*.json`) when done
