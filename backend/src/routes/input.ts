import { z } from 'zod'
import { readInput } from '../errors.js'

const noBody = z.union([z.undefined(), z.strictObject({})])
export const requireNoBody = (body: unknown) => readInput(noBody, body, 'This action takes no request fields.')
export const routeId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)
