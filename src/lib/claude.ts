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
          content: `¿Es este texto un claim factual verificable? Responde SOLO JSON: {"verifiable":true/false,"category":"politics|health|technology|economy|environment|social|science|entertainment|other","urgency":"low|medium|high"}\n\nTexto: "${claim.substring(0, 300)}"`,
        },
        {
          role: 'assistant',
          content: '{',
        },
      ],
    });

    const text = '{' + (message.content[0].type === 'text' ? message.content[0].text : '');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('Haiku classification failed:', err);
    return { verifiable: true, category: 'other', urgency: 'medium' };
  }
}

/**
 * Deep analysis with Sonnet — only called when needed.
 * Uses assistant prefill to force JSON output.
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
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `Verifica este claim: "${claim.substring(0, 500)}"${sourcesContext}\n\nResponde SOLO con el JSON.`,
      },
      {
        role: 'assistant',
        content: '{',
      },
    ],
    system: SYSTEM_PROMPT,
  });

  const text = '{' + (message.content[0].type === 'text' ? message.content[0].text : '');

  // Extract JSON — handle potential markdown wrapping
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('Claude raw response:', text.substring(0, 500));
    throw new Error('Failed to parse AI response as JSON');
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    // Try to fix common JSON issues (trailing commas, etc.)
    const fixed = jsonMatch[0]
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    return JSON.parse(fixed);
  }
}
