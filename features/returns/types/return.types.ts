export type SellerReturnStatus =
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'RETURN_RECEIVED'
  | 'INSPECTION_PENDING'
  | 'INSPECTING'
  | 'INSPECTION_PASSED'
  | 'INSPECTION_FAILED'
  | 'DISPOSITION_PENDING'
  | 'DISPOSITION_COMPLETED'
  | 'DISPUTED'
  | 'APPROVED_FOR_REFUND'
  | 'REPLACEMENT_PENDING'
  | 'REPLACEMENT_SHIPPED'
  | 'REPLACEMENT_DELIVERED'
  | 'REJECTED'
  | 'REJECTED_AFTER_INSPECTION'
  | 'COMPLETED'
  | 'CANCELLED'

export type InspectionResult = 'PASSED' | 'FAILED'

export type InspectionCondition =
  | 'INTACT'
  | 'DAMAGED'
  | 'USED'
  | 'TAG_MISSING'
  | 'WRONG_ITEM'
  | 'MISSING_PARTS'
  | 'OTHER'

export type DisputeReason =
  | 'WRONG_ITEM_RETURNED'
  | 'ITEM_USED'
  | 'ITEM_DAMAGED_BY_CUSTOMER'
  | 'MISSING_PARTS'
  | 'TAG_REMOVED'
  | 'DIFFERENT_PRODUCT'
  | 'OTHER'

export interface ReturnItemSnapshot {
  _id: string
  productId: string
  variantId: string
  quantity: number
  unitPrice: number
  lineTotal: number
  reason?: string
  productSnapshot?: {
    title?: string
    name?: string
    image?: string
    sku?: string
    attributes?: Record<string, string>
  }
  disposition?: ReturnDispositionItem | null
}

export type DispositionCategory =
  | 'RESTOCKABLE'
  | 'DAMAGED'
  | 'DEFECTIVE'
  | 'UNSALEABLE'
  | 'MISSING_PARTS'
  | 'WRONG_ITEM'
  | 'AUTHENTICITY_HOLD'
  | 'SUSPECTED_COUNTERFEIT'
  | 'TAMPERED'
  | 'AUTHENTICITY_MISMATCH'

export interface ReturnDispositionItem {
  disposedAt?: string
  disposedBy?: string
  disposition: DispositionCategory
  returnedQuantity: number
  acceptedQuantity: number
  rejectedQuantity: number
  restockableQuantity: number
  nonRestockableQuantity: number
  reason?: string
  notes?: string
  restocked?: boolean
  restockedAt?: string
}

export interface ReturnDisposition {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED'
  disposedAt?: string
  disposedBy?: string
  notes?: string
  totalRestockableQuantity?: number
  totalNonRestockableQuantity?: number
  items?: ReturnDispositionItem[]
}

export interface ReturnInspection {
  inspectedBy?: string
  inspectedAt?: string
  result: InspectionResult
  condition: InspectionCondition
  notes?: string | null
  proofImages?: string[]
}

export interface ReturnDispute {
  disputedBy?: string
  disputedAt?: string
  reason: DisputeReason
  description: string
  evidence?: string[]
  status: 'PENDING_ADMIN_REVIEW' | 'RESOLVED_SELLER' | 'RESOLVED_CUSTOMER'
}

export interface StatusHistoryEntry {
  status: string
  changedAt: string
  changedBy?: string
  actorType?: 'CUSTOMER' | 'VENDOR' | 'ADMIN' | 'SYSTEM'
  notes?: string | null
}

export interface SellerReturn {
  _id: string
  returnNumber: string
  orderId: string
  vendorOrderId?: string | null
  vendorId: string
  type: 'RETURN' | 'REPLACEMENT'
  reason: string
  description?: string | null
  status: SellerReturnStatus
  items: ReturnItemSnapshot[]
  evidenceImages?: string[]
  requestedAt: string
  reviewedAt?: string | null
  reviewedBy?: string | null
  approvedAt?: string | null
  approvedBy?: string | null
  receivedAt?: string | null
  receivedBy?: string | null
  completedAt?: string | null
  inspection?: ReturnInspection | null
  dispute?: ReturnDispute | null
  disposition?: ReturnDisposition | null
  statusHistory?: StatusHistoryEntry[]
  order?: {
    _id: string
    orderNumber: string
    status: string
    createdAt: string
    customer?: {
      name?: string
      city?: string
      state?: string
    }
  } | null
  vendorOrder?: {
    _id: string
    status: string
    total: number
  } | null
  replacement?: {
    _id?: string
    replacementNumber?: string
    status?: string
    quantity?: number
    replacementOrderNumber?: string | null
    createdAt?: string
  } | null
  createdAt?: string
  updatedAt?: string
}

export interface SellerReturnListResponse {
  items: SellerReturn[]
  page: number
  limit: number
  total: number
}

export interface SubmitInspectionPayload {
  result: InspectionResult
  condition: InspectionCondition
  notes?: string
  proofImages?: string[]
}

export interface RaiseDisputePayload {
  reason: DisputeReason
  description: string
  evidence?: string[]
}

export interface SubmitDispositionPayload {
  items: Array<{
    returnItemId: string
    disposition: DispositionCategory
    restockableQuantity: number
    nonRestockableQuantity: number
    reason?: string
    notes?: string
  }>
  notes?: string
}
