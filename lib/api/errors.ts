export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly requestId?: string

  constructor(message: string, status: number, code?: string, requestId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}

export const isColdStartError = (error: unknown): boolean => {
  if (error instanceof ApiError) {
    return error.status === 502 || error.status === 503 || error.status === 504 || error.status === 0
  }
  const err = error as any
  const status = err?.status || err?.response?.status
  const code = err?.code
  const message = String(err?.message || '').toLowerCase()
  return (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    code === 'ECONNABORTED' ||
    code === 'ERR_NETWORK' ||
    code === 'ETIMEDOUT' ||
    message.includes('timeout') ||
    message.includes('network error')
  )
}

export const getApiErrorMessage = (error: unknown, fallback = 'Request failed'): string => {
  if (isColdStartError(error)) {
    return "We're taking a little longer than usual to connect. The service may be waking up."
  }

  const err = error as any
  const payloadMessage = err?.response?.data?.message || err?.response?.data?.error?.message || err?.response?.data?.error

  if (!(error instanceof ApiError)) {
    if (typeof payloadMessage === 'string' && payloadMessage.trim()) {
      return payloadMessage
    }
    return error instanceof Error ? error.message : fallback
  }


  // Business error code mappings
  if (error.code === 'ORDER_ALREADY_PACKED') {
    return 'This order can no longer be cancelled or modified because it has already been packed.'
  }
  if (error.code === 'INVALID_VENDOR_ORDER_TRANSITION') {
    return error.message || 'Order cannot be transitioned to that status from its current state.'
  }
  if (error.code === 'INSUFFICIENT_STOCK') {
    return 'Insufficient inventory stock to complete this fulfillment step.'
  }
  if (error.code === 'REFUND_FAILED') {
    return "We couldn't complete the refund yet. The order state has not been modified. Please try again."
  }
  if (error.code === 'DUPLICATE_CANCELLATION_REQUEST') {
    return 'A cancellation request is already pending for this item.'
  }
  if (error.code === 'VENDOR_NOT_APPROVED') {
    return 'Only approved vendors can manage orders.'
  }
  if (error.status === 401 || error.code === 'UNAUTHORIZED') {
    return 'Your seller session has expired. Please sign in again.'
  }
  if (error.status === 403 || error.code === 'FORBIDDEN') {
    return 'You do not have permission to perform this action.'
  }
  if (error.status === 404 || error.code === 'ROUTE_NOT_FOUND' || error.code === 'ORDER_NOT_FOUND') {
    return 'The requested route or resource was not found.'
  }
  if (error.status === 413 || error.code === 'IMAGE_TOO_LARGE') {
    return 'Each image must be 2 MB or smaller.'
  }
  if (error.status === 400 || error.code === 'VALIDATION_ERROR') {
    return error.message || 'Please check the details and try again.'
  }

  const supportSuffix = error.requestId ? ` If the problem continues, contact support with Request ID ${error.requestId}.` : ''

  if (error.status >= 500) {
    return `The server could not complete this request right now. Please try again.${supportSuffix}`
  }

  return error.message ? `${error.message}${supportSuffix}` : `${fallback}${supportSuffix}`
}
