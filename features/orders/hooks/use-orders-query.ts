'use client'

import { useQuery } from '@tanstack/react-query'
import { orderService } from '@/features/orders/services/order-service'

export function useOrdersQuery(params: Parameters<typeof orderService.list>[0] = {}) {
  return useQuery({ queryKey: ['orders', params], queryFn: () => orderService.list(params) })
}
