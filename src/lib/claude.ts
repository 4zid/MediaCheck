import Anthropic from '@anthropic-ai/sdk';
import type { FactCheckResult } from './types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Eres un verificador de hechos profesional e imparcial. Tu trabajo es analizar afirmaciones (claims) y determinar su veracidad basándote en las fuentes proporcionadas y tu conocimiento.

DEBES responder SIEMPRE en formato JSON válido con esta estructura exacta:
{
  "verdict": "verified" | "partially_true" | "false" | "unverified" | "misleading",
  "confidence": <número 0-100>,
  "summary": "<resumen de 1-2 oraciones del resultado>",
  "analysis": "<análisis detallado de 2-4 párrafos explicando el razonamiento>",
  "category": "politics" | "health" | "technology" | "economy" | "environment" | "social" | "science" | "entertainment" | "other",
  "sources": [
    {
      "url": "<URL de la fuente>",
      "title": "<título de la fuente>",
      "snippet": "<extracto relevante>",
      "credibility_score": <0-100>,
      "supports_claim": <true/false>,
      "source_name": "<nombre del medio/fuente>"
    }
  ]
}

Criterios:
- "verified": La afirmación es precisa y respaldada por múltiples fuentes confiables
- "partially_true": Contiene elementos verdaderos pero es incompleta o sacada de contexto
- "false": La afirmación es incorrecta o fabricada
- "unverified": No hay suficiente evidencia para confirmar o desmentir
- "misleading": Técnicamente contiene hechos pero presentados de forma engañosa

Sé objetivo, cita fuentes específicas y explica tu razonamiento claramente.`;

export async function factCheck(
  claim: string,
  contextSources: { title: string; url: string; content: string }[] = []
): Promise<FactCheckResult & { category: string }> {
  const sourcesContext = contextSources.length > 0
    ? `\n\nFuentes encontradas para contexto:\n${contextSources.map((s, i) => `${i + 1}. [${s.title}](${s.url})\n${s.content.slice(0, 500)}`).join('\n\n')}`
    : '';

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Verifica la siguiente afirmación:\n\n"${claim}"${sourcesContext}\n\nResponde SOLO con el JSON estructurado.`,
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
