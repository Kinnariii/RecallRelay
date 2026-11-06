import { z } from 'zod'
import type { Config } from '../config.js'
import { modelExtractionSchema } from '../types.js'

const completion = z.object({
  choices: z.tuple([z.object({
    finish_reason: z.literal('stop'),
    message: z.object({ content: z.string().min(1), refusal: z.null().optional() }),
  })]),
})
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
    const response = await transport('https://api.openai.com/v1/chat/completions', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(6000),
      headers: {
        Authorization: `Bearer ${config.AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.AI_MODEL,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_completion_tokens: 2200,
        store: false,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'supplier_recall', strict: true, schema: outputSchema },
        },
      }),
    })
    if (!response.ok) {
      await response.body?.cancel()
      throw new Error('The extraction provider rejected the request.')
    }
    return completion.parse(await response.json()).choices[0].message.content
  }
}
