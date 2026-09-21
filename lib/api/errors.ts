export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

  export const getApiErrorMessage = (error: unknown, fallback = 'Request failed') => {
    if (!(error instanceof ApiError)) return error instanceof Error ? error.message : fallback
    if (error.status === 401 || error.code === 'UNAUTHORIZED') return 'Your seller session has expired. Please sign in again.'
    if (error.status === 403 || error.code === 'FORBIDDEN') return 'You do not have permission to perform this action.'
    if (error.status === 404 || error.code === 'ROUTE_NOT_FOUND') return 'The requested route or resource was not found.'
    if (error.status === 413 || error.code === 'IMAGE_TOO_LARGE') return 'Each image must be 2 MB or smaller.'
    if (error.status === 400 || error.code === 'VALIDATION_ERROR') return error.message || 'Please check the product details and try again.'
    if (error.status >= 500) return error.message || 'The server could not complete this request. Please try again.'
    return error.message || fallback
  }
