import { api } from '@/api'

export type VerificationDocument = { id: string; documentType: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; submittedAt?: string; verifiedAt?: string | null; rejectionReason?: string | null }
export type VerificationState = {
  vendor: { id: string; businessName: string; status: string; verificationStatus: string; rejectionReason?: string | null; approvedAt?: string | null; rejectedAt?: string | null }
  documents: VerificationDocument[]
  bankAccount: { id: string; accountHolderName: string; bankName: string; branchName?: string; ifscCode?: string; accountType?: string; maskedAccountNumber?: string; createdAt?: string; updatedAt?: string } | null
  readiness: { vendorApproved: boolean; documentsComplete: boolean; documentsVerified: boolean; bankSubmitted: boolean; providerKycVerified: boolean; payoutProviderReady: boolean }
  missingDocumentTypes: string[]
  requiredActions: string[]
}

export const verificationService = {
  get: (options?: { signal?: AbortSignal }) => api.get<VerificationState>('/vendors/me/verification', { signal: options?.signal }),
  submitDocument: (payload: { documentType: string; documentNumber?: string; storageKey: string }) => api.post<VerificationDocument>('/vendors/documents', payload),

  submitBankAccount: (payload: { accountHolderName: string; accountNumber: string; bankName: string; branchName?: string; ifscCode: string; accountType?: string }) => api.post<{ id: string; maskedAccountNumber: string }>('/vendors/bank-account', payload),
}
