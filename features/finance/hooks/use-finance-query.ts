'use client'

import { useQuery } from '@tanstack/react-query'
import { financeService } from '@/features/finance/services/finance-service'

export function useFinanceSummaryQuery() {
  return useQuery({ queryKey: ['finance', 'summary'], queryFn: financeService.summary })
}
