'use client'

import { useQuery } from '@tanstack/react-query'
import { productService, type ProductStatus } from '@/features/products/services/product-service'

export function useProductsQuery(params: { page?: number; limit?: number; status?: ProductStatus; search?: string }) {
  return useQuery({ queryKey: ['products', params], queryFn: () => productService.list(params) })
}
