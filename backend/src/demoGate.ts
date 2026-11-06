import { AppError } from './errors.js'

export function createDemoGate() {
  let active = 0
  let resetting = false
  const busy = () => new AppError(409, 'DEMO_BUSY', 'A demo operation is in progress. Try again in a moment.')

  return {
    async run<T>(action: () => T | Promise<T>) {
      if (resetting) throw busy()
      active++
      try { return await action() } finally { active-- }
    },
    async reset<T>(action: () => Promise<T>) {
      if (resetting || active) throw busy()
      resetting = true
      try { return await action() } finally { resetting = false }
    },
  }
}

export type DemoGate = ReturnType<typeof createDemoGate>
