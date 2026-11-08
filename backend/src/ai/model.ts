import { z } from 'zod'
import type { Config } from '../config.js'
import { modelExtractionSchema } from '../types.js'

// Gemini generateContent response envelope
const geminiCompletion = z.object({
  candidates: z.array(z.object({
    content: z.object({
      parts: z.array(z.object({ text: z.string() })),
    }),
    finishReason: z.string(),
  })).nonempty(),
})

// Build a JSON schema for structured output (Gemini schema format)
const outputSchema = z.toJSONSchema(modelExtractionSchema, {
  io: 'input',
  override: ({ jsonSchema }) => {
    delete jsonSchema.minLength
    delete jsonSchema.minimum
    delete jsonSchema.maximum
  },
})
delete outputSchema.$schema

export type ModelCall = (system: string, user: string) => Promise<string>

export function createModel(config: Config, transport: typeof fetch = fetch): ModelCall {
  return async function callModel(system, user) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${config.AI_MODEL}:generateContent?key=${config.AI_API_KEY}`

    const response = await transport(url, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: outputSchema,
          maxOutputTokens: 2200,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.text().catch(() => '')
      throw new Error(`The extraction provider rejected the request: ${response.status} ${err}`)
    }

    const data = geminiCompletion.parse(await response.json())
    const candidate = data.candidates[0]
    if (candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
      throw new Error(`Gemini finished with reason: ${candidate.finishReason}`)
    }
    return candidate.content.parts.map(p => p.text).join('')
  }
}
