import { z } from 'zod'

export function usdAmount(cents: number) {
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('A positive amount in cents is required.')
  return { currency_code: 'USD' as const, value: `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}` }
}

export const usdResponse = z.object({
  currency_code: z.literal('USD'),
  value: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
}).transform(({ value }) => {
  const [units, fractional = ''] = value.split('.')
  return Number(units) * 100 + Number(fractional.padEnd(2, '0'))
}).pipe(z.number().int().nonnegative())
