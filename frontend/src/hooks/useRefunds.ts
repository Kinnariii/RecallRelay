import { useCallback } from 'react'
import { api } from '../api'
import { useAsync } from './useAsync'

export function useRefunds(id: string) {
  return useAsync(useCallback(async () => (await api.refunds(id)).refunds, [id]))
}
