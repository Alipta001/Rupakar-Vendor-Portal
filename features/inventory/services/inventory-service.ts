import { api } from '@/api'

export type InventoryProduct = { _id: string; name: string; slug: string }
export type InventoryVariant = { _id: string; sku: string; price: number; attributes?: Record<string, string> }
export type InventoryItem = {
  _id: string
  productId: InventoryProduct | string
  variantId: InventoryVariant | string
  availableQuantity: number
  reservedQuantity: number
  soldQuantity: number
  lowStockThreshold: number
  status: 'ACTIVE' | 'INACTIVE' | 'LOW_STOCK'
  updatedAt?: string
}
export type InventoryPage = { items: InventoryItem[]; page: number; limit: number; total: number }
export type InventoryStatus = 'ACTIVE' | 'INACTIVE' | 'LOW_STOCK'

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') search.set(key, String(value)) })
  const value = search.toString()
  return value ? `?${value}` : ''
}

export const inventoryService = {
  list: (params: { page?: number; limit?: number; search?: string; status?: InventoryStatus } = {}) => api.get<InventoryPage>(`/vendor/inventory${query(params)}`),
  adjust: (variantId: string, delta: number, reason = 'SELLER_ADJUSTMENT') => api.patch<InventoryItem>(`/vendor/inventory/${variantId}`, { delta, reason }),
}
