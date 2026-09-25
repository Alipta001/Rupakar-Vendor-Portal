import { api } from '@/api'

export type AnalyticsRange = '7d' | '30d' | '90d' | '1y'

export type SalesTrendPoint = {
  date: string
  label: string
  revenue: number
  orders: number
  units: number
}

export type StatusBreakdownItem = {
  status: string
  count: number
  revenue: number
}

export type TopProductItem = {
  productId: string
  variantId?: string
  productName: string
  sku?: string
  unitsSold: number
  revenue: number
}

export type AnalyticsSummary = {
  revenue: number
  orders: number
  unitsSold: number
  averageOrderValue: number
  customerCount: number
}

export type AnalyticsData = {
  range: AnalyticsRange
  summary: AnalyticsSummary
  salesTrend: SalesTrendPoint[]
  statusBreakdown: StatusBreakdownItem[]
  topProducts: TopProductItem[]
}

export const analyticsService = {
  get: (range: AnalyticsRange = '30d', options?: { signal?: AbortSignal }) =>
    api.get<AnalyticsData>(`/vendor/analytics?range=${range}`, { signal: options?.signal }),
}

