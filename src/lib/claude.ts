import Anthropic from '@anthropic-ai/sdk';
import type { FactCheckResult } from './types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Compact system prompt (~80 tokens instead of ~300)
const SYSTEM_PROMPT = `Fact-checker imparcial. Analiza claim vs evidencia. Responde SOLO JSON:
{"verdict":"verified|partially_true|false|unverified|misleading","confidence":0-100,"summary":"(máx 2 oraciones)","analysis":"(2-3 párrafos)","category":"politics|health|technology|economy|environment|social|science|entertainment|other","sources":[{"url":"","title":"","snippet":"","credibility_score":0-100,"supports_claim":true/false,"source_name":""}]}`;

/**
 * Quick classification with Haiku — determines if claim needs deep analysis.
 * Returns null if Haiku thinks it's not a verifiable claim,
 * or a pre-classification to guide Sonnet.
 */
export async function classifyWithHaiku(
  claim: string
): Promise<{ verifiable: boolean; category: string; urgency: 'low' | 'medium' | 'high' } | null> {
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      stop_sequences: ['\n\n'],
      messages: [
        {
          role: 'user',
          content: `Clasifica este texto. ¿Es un claim factual verificable? Responde JSON: {"verifiable":true/false,"category":"politics|health|technology|economy|environment|social|science|entertainment|other","urgency":"low|medium|high"}\n\nTexto: "${claim.substring(0, 300)}"`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('Haiku classification failed:', err);
    // Fall through to Sonnet on Haiku failure
    return { verifiable: true, category: 'other', urgency: 'medium' };
  }
}

/**
 * Deep analysis with Sonnet — only called when needed.
 * Sources are pre-compressed (title + short description only).
 */
export async function factCheck(
  claim: string,
  contextSources: { title: string; url: string; content: string }[] = []
): Promise<FactCheckResult & { category: string }> {
  // Compress evidence — never send full articles, only title + short snippet + source
  const compressedSources = contextSources.slice(0, 8).map((s, i) =>
    `${i + 1}. [${s.title}](${s.url})\n${s.content.substring(0, 200)}`
  ).join('\n');

  const sourcesContext = compressedSources
    ? `\n\nEvidencia:\n${compressedSources}`
    : '';

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    stop_sequences: ['\n\n\n'],
    messages: [
      {
        role: 'user',
        content: `Verifica: "${claim.substring(0, 500)}"${sourcesContext}`,
      },
    ],
    system: SYSTEM_PROMPT,
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response as JSON');
  }

  const result = JSON.parse(jsonMatch[0]);
  return result;
}
