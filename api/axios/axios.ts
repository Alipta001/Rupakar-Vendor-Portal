import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { environment } from '@/config/environment'
import { AUTH_EXPIRED_EVENT } from '@/lib/auth/auth-session'
import { authStorage } from '@/lib/auth/auth-storage'
import { ApiError } from '@/lib/api/errors'

export const API_BASE_URL = environment.apiBaseUrl

const client = axios.create({ baseURL: API_BASE_URL, withCredentials: true, headers: { Accept: 'application/json' } })
const refreshClient = axios.create({ baseURL: API_BASE_URL, withCredentials: true, headers: { Accept: 'application/json', 'Content-Type': 'application/json' } })

let accessToken = ''
let refreshPromise: Promise<{ token: string | null; isColdStart: boolean }> | null = null

export const setAccessToken = (token: string | null) => {
  accessToken = token || ''
  authStorage.setAccessToken(token)
}

const getAccessToken = () => accessToken || authStorage.getAccessToken()
const shouldSkipRefresh = (url?: string) => Boolean(url && /^\/auth\/(login|register-seller|refresh|logout|forgot-password|reset-password|verify-otp)/.test(url))

const MAX_TRANSIENT_RETRIES = 2
const TRANSIENT_STATUSES = new Set([502, 503, 504])

const isTransientNetworkError = (error: AxiosError): boolean => {
  const isCanceled = Boolean(
    ((axios as any)?.isCancel && (axios as any).isCancel(error)) ||
    error?.name === 'CanceledError' ||
    error?.name === 'AbortError' ||
    error?.code === 'ERR_CANCELED'
  )
  if (isCanceled) return false

  const status = error.response?.status
  if (status && TRANSIENT_STATUSES.has(status)) return true
  if (
    !error.response &&
    (error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      (typeof error.message === 'string' && (error.message.includes('Network Error') || error.message.includes('Failed to fetch'))))
  ) {
    return true
  }
  return false
}


const isSafeMethod = (method?: string): boolean => {
  const m = (method || 'GET').toUpperCase()
  return m === 'GET' || m === 'HEAD' || m === 'OPTIONS'
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const toApiError = (error: AxiosError) => {
  const payload = error.response?.data as {
    message?: string
    error?: { message?: string; code?: string }
    code?: string
    requestId?: string
  } | undefined
  const requestId = payload?.requestId || (error.response?.headers?.['x-request-id'] as string | undefined)
  const message = payload?.error?.message || payload?.message || error.message || 'Request failed'
  const code = payload?.error?.code || payload?.code
  return new ApiError(message, error.response?.status || 0, code, requestId)
}

const refreshAccessToken = async () => {
  try {
    const response = await refreshClient.post('/auth/refresh')
    const token = response.data?.data?.accessToken || response.data?.accessToken || null
    setAccessToken(token)
    return { token, isColdStart: false }
  } catch (error: any) {
    const isColdStart = isTransientNetworkError(error)
    return { token: null, isColdStart }
  }
}

client.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  if (config.data instanceof FormData) config.headers.delete('Content-Type')
  else if (!config.headers.has('Content-Type')) config.headers.set('Content-Type', 'application/json')
  return config
})

client.interceptors.response.use(
  (response) => {
    response.data = response.data?.data ?? response.data
    return response
  },
  async (error: AxiosError) => {
    const request = error.config as (AxiosRequestConfig & { _retry?: boolean; _retryCount?: number }) | undefined

    // 1. Safe GET bounded cold-start retry
    if (request && isSafeMethod(request.method) && isTransientNetworkError(error)) {
      const currentRetry = request._retryCount ?? 0
      if (currentRetry < MAX_TRANSIENT_RETRIES) {
        request._retryCount = currentRetry + 1
        const delay = 800 * Math.pow(2, currentRetry)
        await sleep(delay)
        return client(request)
      }
    }

    // 2. 401 handling
    if (error.response?.status === 401 && request && !request._retry && !shouldSkipRefresh(request.url)) {
      request._retry = true
      refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = null })
      const { token, isColdStart } = await refreshPromise
      if (token) {
        request.headers = request.headers || {}
        request.headers.Authorization = `Bearer ${token}`
        return client(request)
      }
      if (!isColdStart) {
        setAccessToken(null)
        if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
      }
    }
    return Promise.reject(toApiError(error))
  },
)

export const api = {
  get: <T>(path: string, config?: AxiosRequestConfig) => client.get<T>(path, config).then((response) => response.data),
  post: <T>(path: string, body?: unknown, config?: AxiosRequestConfig) => client.post<T>(path, body, config).then((response) => response.data),
  patch: <T>(path: string, body: unknown, config?: AxiosRequestConfig) => client.patch<T>(path, body, config).then((response) => response.data),
  delete: <T>(path: string, config?: AxiosRequestConfig) => client.delete<T>(path, config).then((response) => response.data),
}
