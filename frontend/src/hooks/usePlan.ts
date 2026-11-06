import { useCallback } from 'react'
import { api } from '../api'
import { useAsync } from './useAsync'

export function usePlan(id: string) {
  return useAsync(useCallback(async () => (await api.plan(id)).plan, [id]))
}
