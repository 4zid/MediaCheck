import Anthropic from '@anthropic-ai/sdk';
import type { FactCheckResult } from './types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildSystemPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `Eres un fact-checker. Fecha actual: ${today}.
REGLAS ESTRICTAS:
- Responde SOLO JSON válido, sin markdown, sin texto antes o después
- "summary": máximo 2 oraciones cortas
- "analysis": máximo 1 párrafo corto
- "sources": máximo 3 fuentes, snippets de máximo 50 caracteres
- "supports_claim": SOLO usa true/false si la fuente habla DIRECTAMENTE del mismo tema del claim. Si la fuente no tiene relación directa, usa null.
- Las fuentes con fechas del año actual (${today.slice(0, 4)}) son recientes y válidas. NO las descartes por "fecha futura".
- Usa las fechas de publicación de las fuentes para evaluar su relevancia temporal.
Estructura exacta:
{"verdict":"verified|partially_true|false|unverified|misleading","confidence":0-100,"summary":"...","analysis":"...","category":"politics|health|technology|economy|environment|social|science|entertainment|other","sources":[{"url":"...","title":"...","snippet":"...","credibility_score":0-100,"supports_claim":true|false|null,"source_name":"..."}]}`;
}

/**
 * Quick classification with Haiku.
 */
export async function classifyWithHaiku(
  claim: string
): Promise<{ verifiable: boolean; category: string; urgency: 'low' | 'medium' | 'high' } | null> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `Fecha actual: ${today}. ¿Es este texto un claim factual verificable? Responde SOLO con JSON, nada más: {"verifiable":true/false,"category":"politics|health|technology|economy|environment|social|science|entertainment|other","urgency":"low|medium|high"}\n\nTexto: "${claim.substring(0, 300)}"`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('Haiku classification failed:', err);
    return { verifiable: true, category: 'other', urgency: 'medium' };
  }
}

/**
 * Deep analysis with Sonnet.
 */
export async function factCheck(
  claim: string,
  contextSources: { title: string; url: string; content: string; date?: string }[] = []
): Promise<FactCheckResult & { category: string }> {
  const compressedSources = contextSources.slice(0, 5).map((s, i) => {
    const dateStr = s.date ? `[${s.date.slice(0, 10)}] ` : '';
    const snippet = s.content ? ` — ${s.content.substring(0, 100)}` : '';
    return `${i + 1}. ${dateStr}${s.title}${snippet} (${s.url})`;
  }).join('\n');

  const sourcesContext = compressedSources
    ? `\n\nFuentes:\n${compressedSources}`
    : '';

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `Verifica: "${claim.substring(0, 400)}"${sourcesContext}\n\nJSON solamente:`,
      },
    ],
    system: buildSystemPrompt(),
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  return repairAndParseJSON(text);
}

/**
 * Parse JSON from Claude, repairing truncation if needed.
 */
function repairAndParseJSON(raw: string): FactCheckResult & { category: string } {
  // Strip markdown fences
  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  const start = text.indexOf('{');
  if (start === -1) {
    console.error('No JSON object in response:', raw.substring(0, 300));
    throw new Error('Failed to parse AI response as JSON');
  }
  text = text.substring(start);

  // Attempt 1: parse as-is
  try { return JSON.parse(text); } catch { /* continue */ }

  // Attempt 2: fix common issues then try to close truncated JSON
  // Trim any trailing non-JSON text after the last } or ]
  const lastBrace = text.lastIndexOf('}');
  const lastBracket = text.lastIndexOf(']');
  const lastClose = Math.max(lastBrace, lastBracket);
  if (lastClose > 0) {
    const trimmed = text.substring(0, lastClose + 1)
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    try { return JSON.parse(trimmed); } catch { /* continue */ }
  }

  // Attempt 3: aggressive truncation repair
  // Find the last successfully parseable prefix
  // Strategy: truncate at the last complete property, close all open structures
  let repaired = text;

  // If we're mid-string, close it
  const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    // Truncate to last complete string
    const lastGoodQuote = findLastCompleteString(repaired);
    if (lastGoodQuote > 0) {
      repaired = repaired.substring(0, lastGoodQuote + 1);
    } else {
      repaired += '"';
    }
  }

  // Remove trailing partial tokens (comma, colon, etc.)
  repaired = repaired.replace(/[,:\s]+$/, '');

  // Close all open brackets and braces
  let openBraces = 0;
  let openBrackets = 0;
  let inStr = false;
  let esc = false;
  for (const ch of repaired) {
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') openBraces++;
    else if (ch === '}') openBraces--;
    else if (ch === '[') openBrackets++;
    else if (ch === ']') openBrackets--;
  }

  // Remove trailing comma before we close
  repaired = repaired.replace(/,\s*$/, '');

  for (let i = 0; i < openBrackets; i++) repaired += ']';
  for (let i = 0; i < openBraces; i++) repaired += '}';

  repaired = repaired
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']');

  try { return JSON.parse(repaired); } catch { /* continue */ }

  // Attempt 4: extract just the core fields with regex
  console.error('All JSON repair attempts failed. Extracting fields manually.');
  console.error('Raw response:', raw.substring(0, 800));

  const verdict = extractField(raw, 'verdict') || 'unverified';
  const confidence = parseInt(extractField(raw, 'confidence') || '50', 10);
  const summary = extractField(raw, 'summary') || 'No se pudo completar el análisis.';
  const analysis = extractField(raw, 'analysis') || summary;
  const category = extractField(raw, 'category') || 'other';

  return {
    verdict: verdict as FactCheckResult['verdict'],
    confidence,
    summary,
    analysis,
    category,
    sources: [],
  };
}

function findLastCompleteString(text: string): number {
  let lastComplete = -1;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if (ch === '"') {
      if (inStr) lastComplete = i;
      inStr = !inStr;
    }
  }
  return lastComplete;
}

function extractField(text: string, field: string): string | null {
  const regex = new RegExp(`"${field}"\\s*:\\s*"([^"]*)"`, 'i');
  const match = text.match(regex);
  return match ? match[1] : null;
}
