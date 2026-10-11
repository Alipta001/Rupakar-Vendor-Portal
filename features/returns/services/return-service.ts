import { api } from '@/api'
import { endpoints } from '@/api/endPoints/endPoints'
import type {
  SellerReturn,
  SellerReturnListResponse,
  SellerReturnStatus,
  SubmitInspectionPayload,
  RaiseDisputePayload,
  SubmitDispositionPayload,
} from '../types/return.types'

export interface ListReturnsParams {
  page?: number
  limit?: number
  status?: SellerReturnStatus
  search?: string
  returnNumber?: string
  orderNumber?: string
  fromDate?: string
  toDate?: string
}

export const returnService = {
  list: (params: ListReturnsParams = {}, config?: { signal?: AbortSignal }): Promise<SellerReturnListResponse> =>
    api.get<SellerReturnListResponse>(endpoints.vendors.returns, { params, signal: config?.signal }),

  getById: (id: string, config?: { signal?: AbortSignal }): Promise<SellerReturn> =>
    api.get<SellerReturn>(`${endpoints.vendors.returns}/${id}`, { signal: config?.signal }),

  review: (id: string, notes?: string): Promise<SellerReturn> =>
    api.post<SellerReturn>(`${endpoints.vendors.returns}/${id}/review`, { notes }),

  approve: (id: string, notes?: string): Promise<SellerReturn> =>
    api.post<SellerReturn>(`${endpoints.vendors.returns}/${id}/approve`, { notes }),

  markReceived: (id: string, notes?: string): Promise<SellerReturn> =>
    api.post<SellerReturn>(`${endpoints.vendors.returns}/${id}/receive`, { notes }),

  readyForInspection: (id: string): Promise<SellerReturn> =>
    api.post<SellerReturn>(`${endpoints.vendors.returns}/${id}/ready-for-inspection`, {}),

  submitInspection: (id: string, payload: SubmitInspectionPayload): Promise<SellerReturn> =>
    api.post<SellerReturn>(`${endpoints.vendors.returns}/${id}/inspect`, payload),

  raiseDispute: (id: string, payload: RaiseDisputePayload): Promise<SellerReturn> =>
    api.post<SellerReturn>(`${endpoints.vendors.returns}/${id}/dispute`, payload),

  submitDisposition: (id: string, payload: SubmitDispositionPayload): Promise<SellerReturn> =>
    api.post<SellerReturn>(`${endpoints.vendors.returns}/${id}/disposition`, payload),
}
