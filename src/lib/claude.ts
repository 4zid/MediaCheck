import Anthropic from '@anthropic-ai/sdk';
import type { FactCheckResult } from './types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Eres un fact-checker imparcial. Analiza el claim contra la evidencia proporcionada.
Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto extra). Estructura:
{"verdict":"verified|partially_true|false|unverified|misleading","confidence":0-100,"summary":"resumen breve","analysis":"análisis de 2-3 párrafos","category":"politics|health|technology|economy|environment|social|science|entertainment|other","sources":[{"url":"","title":"","snippet":"","credibility_score":0-100,"supports_claim":true,"source_name":""}]}`;

/**
 * Quick classification with Haiku — determines if claim needs deep analysis.
 */
export async function classifyWithHaiku(
  claim: string
): Promise<{ verifiable: boolean; category: string; urgency: 'low' | 'medium' | 'high' } | null> {
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `¿Es este texto un claim factual verificable? Responde SOLO con JSON, nada más: {"verifiable":true/false,"category":"politics|health|technology|economy|environment|social|science|entertainment|other","urgency":"low|medium|high"}\n\nTexto: "${claim.substring(0, 300)}"`,
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
  contextSources: { title: string; url: string; content: string }[] = []
): Promise<FactCheckResult & { category: string }> {
  const compressedSources = contextSources.slice(0, 8).map((s, i) =>
    `${i + 1}. [${s.title}](${s.url}): ${s.content.substring(0, 200)}`
  ).join('\n');

  const sourcesContext = compressedSources
    ? `\n\nEvidencia:\n${compressedSources}`
    : '';

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    messages: [
      {
        role: 'user',
        content: `Verifica este claim: "${claim.substring(0, 500)}"${sourcesContext}\n\nResponde SOLO con el JSON, sin markdown ni texto adicional.`,
      },
    ],
    system: SYSTEM_PROMPT,
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  return parseClaudeJSON(text);
}

/**
 * Robustly parse JSON from Claude's response, handling:
 * - Markdown code blocks
 * - Trailing commas
 * - Truncated JSON (close open brackets/braces)
 */
function parseClaudeJSON(raw: string): FactCheckResult & { category: string } {
  // Strip markdown
  let text = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  // Extract the outermost JSON object
  const start = text.indexOf('{');
  if (start === -1) {
    console.error('No JSON found in Claude response:', raw.substring(0, 300));
    throw new Error('Failed to parse AI response as JSON');
  }

  text = text.substring(start);

  // Try parsing as-is first
  try {
    return JSON.parse(text);
  } catch {
    // Continue to repair
  }

  // Fix trailing commas
  let fixed = text
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']');

  try {
    return JSON.parse(fixed);
  } catch {
    // Continue to repair truncation
  }

  // Handle truncated JSON: close any open brackets/braces
  // Count unmatched openers
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escape = false;

  for (const ch of fixed) {
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;
  }

  // Remove any trailing incomplete string (ends mid-value)
  if (inString) {
    // Find last complete key-value and truncate there
    const lastQuote = fixed.lastIndexOf('"');
    if (lastQuote > 0) {
      fixed = fixed.substring(0, lastQuote + 1);
    }
  }

  // Close open structures
  // Remove trailing comma before closing
  fixed = fixed.replace(/,\s*$/, '');

  for (let i = 0; i < brackets; i++) fixed += ']';
  for (let i = 0; i < braces; i++) fixed += '}';

  // Final cleanup
  fixed = fixed
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']');

  try {
    return JSON.parse(fixed);
  } catch {
    console.error('JSON repair failed. Raw:', raw.substring(0, 500));
    console.error('Repaired attempt:', fixed.substring(0, 500));
    throw new Error('Failed to parse AI response as JSON');
  }
}
