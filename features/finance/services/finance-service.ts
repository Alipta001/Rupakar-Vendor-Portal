import { api } from '@/lib/api/client'

export type LedgerEntry = { _id: string; parentOrderId: string; vendorOrderId: string; vendorId: string; paymentId: string; transactionType: string; status: string; grossAmount: number; commissionRate: number; commissionAmount: number; commissionSource: string; paymentFee: number; adjustmentAmount: number; netAmount: number; currency: string; createdAt?: string }
export type LedgerPage = { items: LedgerEntry[]; page: number; limit: number; total: number }
export type LedgerSummary = { grossAmount: number; commissionAmount: number; paymentFee: number; adjustmentAmount: number; netAmount: number; count: number }
export type SettlementReadiness = { approvedVendor: boolean; verifiedVendor: boolean; bankAccountPresent: boolean; providerConfigured: boolean; payoutRequestsEnabled: boolean; eligible: boolean; reason: string | null }
export type SettlementBalance = { ledgerNet: number; pendingAmount: number; eligibleAmount: number; settledAmount: number; reservedAmount: number; availableAmount: number; currency: string; readiness: SettlementReadiness }
export type PayoutRecord = { _id: string; requestedAmount: number; eligibleAmount: number; status: string; provider: string; providerTransferId?: string | null; currency: string; failureReason?: string | null; reversalAmount: number; createdAt?: string }
export type PayoutPage = { items: PayoutRecord[]; page: number; limit: number; total: number }

export const financeService = {
  ledger: (page = 1, limit = 20) => api.get<LedgerPage>(`/vendor/finance/ledger?page=${page}&limit=${limit}`),
  summary: () => api.get<LedgerSummary>('/vendor/finance/summary'),
  balance: () => api.get<SettlementBalance>('/vendor/finance/balance'),
  payouts: (page = 1, limit = 20) => api.get<PayoutPage>(`/vendor/finance/payouts?page=${page}&limit=${limit}`),
}
