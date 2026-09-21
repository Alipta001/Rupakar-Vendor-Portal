'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/features/dashboard/services/dashboard-data'

export const dashboardQueryKey = ['dashboard'] as const

export function useDashboardQuery() {
  return useQuery({ queryKey: dashboardQueryKey, queryFn: dashboardService.get })
}
