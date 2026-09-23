import { api } from '@/api'

export type VendorOrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'CONFIRMED' | 'PROCESSING' | 'READY_TO_SHIP' | 'PACKED' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'FAILED' | 'REFUND_PENDING' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
export type VendorOrderItem = { productId: string; variantId: string; productName: string; sku: string; quantity: number; unitPrice: number; lineTotal: number; productSnapshot?: Record<string, string> }
export type VendorOrderParent = { _id: string; paymentStatus: string; status: string; shippingAddressSnapshot?: Record<string, string>; createdAt?: string; updatedAt?: string }
export type VendorOrder = { _id: string; parentOrderId: string; vendorId: string; customerId: string; status: VendorOrderStatus; items: VendorOrderItem[]; subtotal: number; discount: number; tax: number; shipping: number; total: number; currency: string; shipment?: { trackingNumber?: string | null; trackingUrl?: string | null; status?: string } | null; parent?: VendorOrderParent | null; createdAt?: string; updatedAt?: string }
export type VendorOrderPage = { items: VendorOrder[]; page: number; limit: number; total: number }
export type VendorOrderActionResult = { vendorOrder: VendorOrder; order?: Record<string, unknown>; shipment?: Record<string, unknown> }
export type DocumentDownload = { documentNumber?: string; invoiceNumber?: string; downloadUrl: string }
export type CancellationRequest = {
  _id: string
  requestNumber: string
  orderId: string
  vendorOrderId: string
  customerId: string
  vendorId: string
  productId: string
  variantId: string
  productName: string
  sku?: string
  quantity: number
  unitPrice: number
  refundAmount: number
  reason: string
  customerNote?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  rejectionReason?: string
  refundId?: string
  createdAt: string
  reviewedAt?: string
}

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') search.set(key, String(value)) })
  const value = search.toString()
  return value ? `?${value}` : ''
}

export const orderService = {
  list: (params: { page?: number; limit?: number; status?: VendorOrderStatus; search?: string } = {}) => api.get<VendorOrderPage>(`/vendors/orders${query(params)}`),
  get: (id: string) => api.get<VendorOrder>('/vendors/orders/' + id),
  pack: (id: string) => api.post<VendorOrderActionResult>('/vendors/orders/' + id + '/pack', {}),
  process: (id: string) => api.post<VendorOrderActionResult>('/vendors/orders/' + id + '/process', {}),
  readyToShip: (id: string) => api.post<VendorOrderActionResult>('/vendors/orders/' + id + '/ready-to-ship', {}),
  ship: (id: string) => api.post<VendorOrderActionResult>('/vendors/orders/' + id + '/ship', {}),
  invoice: (id: string) => api.get<DocumentDownload>('/vendors/orders/' + id + '/invoice'),
  packingSlip: (id: string) => api.get<DocumentDownload>('/vendors/orders/' + id + '/packing-slip'),
  cancellationRequests: (params: { page?: number; limit?: number; status?: string } = {}) =>
    api.get<{ items: CancellationRequest[]; total: number; page: number; limit: number; totalPages: number }>(`/vendors/cancellation-requests${query(params)}`),
  approveCancellation: (id: string) => api.post<{ success: boolean; data: any }>('/vendors/cancellation-requests/' + id + '/approve', {}),
  rejectCancellation: (id: string, rejectionReason: string) =>
    api.post<{ success: boolean; data: any }>('/vendors/cancellation-requests/' + id + '/reject', { rejectionReason }),
}
