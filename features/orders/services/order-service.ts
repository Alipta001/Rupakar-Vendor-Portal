import { api } from '@/api'

export type VendorOrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'CREATED'
  | 'LABEL_GENERATED'
  | 'READY_TO_SHIP'
  | 'PICKUP_REQUESTED'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'RTO_INITIATED'
  | 'RTO_IN_TRANSIT'
  | 'RTO_DELIVERED'
  | 'CANCELLED'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
export type VendorOrderItem = { productId: string; variantId: string; productName: string; sku: string; quantity: number; unitPrice: number; lineTotal: number; productSnapshot?: Record<string, string> }
export type VendorOrderParent = { _id: string; paymentStatus: string; status: string; shippingAddressSnapshot?: Record<string, string>; createdAt?: string; updatedAt?: string }
export type VendorOrder = {
  _id: string
  parentOrderId: string
  vendorId: string
  customerId: string
  status: VendorOrderStatus
  items: VendorOrderItem[]
  subtotal: number
  discount: number
  tax: number
  shipping: number
  total: number
  currency: string
  shipment?: {
    _id?: string
    shipmentNumber?: string | null
    provider?: string | null
    providerShipmentId?: string | null
    carrier?: string | null
    trackingNumber?: string | null
    trackingUrl?: string | null
    shippingMethod?: string | null
    shippingCost?: number | null
    status?: string
    pickupStatus?: string
    pickupScheduledAt?: string
    estimatedDeliveryAt?: string
    labelUrl?: string | null
    packageInfo?: {
      weight?: number
      length?: number
      width?: number
      height?: number
      unit?: string
      dimensionUnit?: string
    } | null
    pickupAddress?: {
      street?: string
      city?: string
      state?: string
      postalCode?: string
      country?: string
      pickupLocationName?: string
      name?: string
      phone?: string
    } | null
    metadata?: Record<string, any> | null
  } | null
  parent?: VendorOrderParent | null
  vendorPickupConfigured?: boolean
  vendorPickupAddress?: {
    pickupLocationName?: string
    contactPerson?: string
    phone?: string
    addressLine1?: string
    addressLine2?: string
    city?: string
    state?: string
    pincode?: string
    country?: string
  } | null
  createdAt?: string
  updatedAt?: string
}
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
  list: (params: { page?: number; limit?: number; status?: VendorOrderStatus; search?: string } = {}, options?: { signal?: AbortSignal }) =>
    api.get<VendorOrderPage>(`/vendors/orders${query(params)}`, { signal: options?.signal }),
  get: (id: string, options?: { signal?: AbortSignal }) => api.get<VendorOrder>('/vendors/orders/' + id, { signal: options?.signal }),
  pack: (id: string) => api.post<VendorOrderActionResult>('/vendors/orders/' + id + '/pack', {}),
  process: (id: string) => api.post<VendorOrderActionResult>('/vendors/orders/' + id + '/process', {}),
  readyToShip: (id: string, packageInfo?: { weight?: number; length?: number; width?: number; height?: number; unit?: string; dimensionUnit?: string }) =>
    api.post<VendorOrderActionResult>('/vendors/orders/' + id + '/ready-to-ship', packageInfo || {}),
  retryShipment: (id: string) => api.post<VendorOrderActionResult>('/vendors/orders/' + id + '/retry-shipment', {}),
  ship: (id: string) => api.post<VendorOrderActionResult>('/vendors/orders/' + id + '/ship', {}),
  shippingLabel: (id: string) => api.get<Blob>('/vendors/orders/' + id + '/shipping-label', { responseType: 'blob' }),
  invoice: (id: string) => api.get<DocumentDownload>('/vendors/orders/' + id + '/invoice'),
  packingSlip: (id: string) => api.get<DocumentDownload>('/vendors/orders/' + id + '/packing-slip'),
  cancellationRequests: (params: { page?: number; limit?: number; status?: string } = {}, options?: { signal?: AbortSignal }) =>
    api.get<{ items: CancellationRequest[]; total: number; page: number; limit: number; totalPages: number }>(`/vendors/cancellation-requests${query(params)}`, { signal: options?.signal }),

  approveCancellation: (id: string) => api.post<{ success: boolean; data: any }>('/vendors/cancellation-requests/' + id + '/approve', {}),
  rejectCancellation: (id: string, rejectionReason: string) =>
    api.post<{ success: boolean; data: any }>('/vendors/cancellation-requests/' + id + '/reject', { rejectionReason }),
}
