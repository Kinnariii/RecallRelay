import type { Api } from './schemas'

export const api: Api = import.meta.env.VITE_USE_MOCK === 'false'
  ? (await import('./real')).realApi
  : (await import('../mocks/mockApi')).mockApi
