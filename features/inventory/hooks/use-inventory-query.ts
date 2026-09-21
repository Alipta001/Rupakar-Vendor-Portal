'use client'

import { useQuery } from '@tanstack/react-query'
import { inventoryService } from '@/features/inventory/services/inventory-service'

export function useInventoryQuery(params: Parameters<typeof inventoryService.list>[0] = {}) {
  return useQuery({ queryKey: ['inventory', params], queryFn: () => inventoryService.list(params) })
}
