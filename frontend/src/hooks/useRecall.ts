import { createContext, useContext } from 'react'

export type RecallEventKind = 'upload' | 'extract' | 'edit' | 'plan' | 'approve'
export type RecallEvent = { kind: RecallEventKind; detail: string; at: string }
export type RecallSession = {
  latestResult: string | null
  events: Record<string, RecallEvent[]>
  record: (id: string, kind: RecallEventKind, detail: string, at?: string) => void
  setLatest: (id: string) => void
  clear: () => void
}

export const RecallContext = createContext<RecallSession>({
  latestResult: null, events: {}, record: () => {}, setLatest: () => {}, clear: () => {},
})
export const useRecall = () => useContext(RecallContext)
