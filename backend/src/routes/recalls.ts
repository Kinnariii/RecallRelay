import { Router } from 'express'
import { z } from 'zod'
import { extractNotice } from '../ai/extract.js'
import type { ModelCall } from '../ai/model.js'
import type { DemoGate } from '../demoGate.js'
import { readInput } from '../errors.js'
import type { RecallStore } from '../recallStore.js'
import { lotFields, text } from '../types.js'
import { routeId } from './input.js'

const extractBody = z.strictObject({
  noticeText: z.string().max(20_000).refine(value => value.trim().length > 0),
})
const patchBody = z.strictObject({ sku: text, ...lotFields }).refine(({ lot_start, lot_end }) =>
  lot_start === null || lot_end === null || lot_start <= lot_end)

export function recallRoutes(recalls: RecallStore, model: ModelCall, gate: DemoGate) {
  return Router()
    .post('/recalls/extract', async (req, res) => {
      const { noticeText } = readInput(extractBody, req.body, 'Provide a notice between 1 and 20,000 characters.')
      const recall = await gate.run(async () => recalls.create(noticeText, await extractNotice(model, noticeText)))
      res.json({ recall })
    })
    .patch('/recalls/:id', async (req, res) => {
      const id = readInput(routeId, req.params.id)
      const edits = readInput(patchBody, req.body, 'Provide a SKU and valid lot bounds in ascending order.')
      const recall = await gate.run(() => recalls.update(id, edits))
      res.json({ recall })
    })
}
