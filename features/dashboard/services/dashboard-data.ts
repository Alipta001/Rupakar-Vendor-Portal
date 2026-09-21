import { api } from '@/api'

export type DashboardVendor = {
  id: string
  businessName: string
  status: string
  verificationStatus: string
}

export type DashboardMetric = {
  totalProducts: number
  publishedProducts: number
  activeOrders: number
  lowStockCount: number
  totalSales: number
  netEarnings: number
  unreadNotifications: number
  settlementLabel: string
}

export type DashboardFinance = {
  ledgerNet: number
  eligibleAmount: number
  availableAmount: number
  pendingAmount: number
  settledAmount: number
  readiness: {
    approvedVendor: boolean
    verifiedVendor: boolean
    bankAccountPresent: boolean
    providerConfigured: boolean
    payoutRequestsEnabled: boolean
    eligible: boolean
    reason: string | null
  }
}

export type DashboardRecentOrder = {
  _id: string
  status: string
  total: number
  createdAt?: string
  itemCount: number
  itemNames: string[]
  parent?: { _id: string; status?: string; paymentStatus?: string } | null
}

export type DashboardLowStockItem = {
  _id: string
  productId: string
  productName: string
  availableQuantity: number
  lowStockThreshold: number
}

export type DashboardSalesPoint = { date: string; label: string; revenue: number; orders: number }

export type DashboardData = {
  vendor: DashboardVendor
  metrics: DashboardMetric
  finance: DashboardFinance
  recentOrders: DashboardRecentOrder[]
  lowStockItems: DashboardLowStockItem[]
  salesTrend: DashboardSalesPoint[]
}

export const dashboardService = {
  get: () => api.get<DashboardData>('/vendor/dashboard'),
}
