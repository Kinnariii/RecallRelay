import { api } from '../api'
import { useAsync } from './useAsync'

const loadOrders = async () => (await api.orders()).orders
export const useOrders = () => useAsync(loadOrders)
