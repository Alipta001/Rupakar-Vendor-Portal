export const queryKeys = {
  seller: ['seller'] as const,
  products: (params?: unknown) => ['seller', 'products', params] as const,
  product: (id: string) => ['seller', 'product', id] as const,
  orders: (params?: unknown) => ['seller', 'orders', params] as const,
  order: (id: string) => ['seller', 'order', id] as const,
  inventory: (params?: unknown) => ['seller', 'inventory', params] as const,
  notifications: (params?: unknown) => ['seller', 'notifications', params] as const,
} as const
