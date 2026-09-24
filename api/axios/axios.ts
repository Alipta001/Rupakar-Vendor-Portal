import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { environment } from '@/config/environment'
import { AUTH_EXPIRED_EVENT } from '@/lib/auth/auth-session'
import { authStorage } from '@/lib/auth/auth-storage'
import { ApiError } from '@/lib/api/errors'

export const API_BASE_URL = environment.apiBaseUrl

const client = axios.create({ baseURL: API_BASE_URL, withCredentials: true, headers: { Accept: 'application/json' } })
const refreshClient = axios.create({ baseURL: API_BASE_URL, withCredentials: true, headers: { Accept: 'application/json', 'Content-Type': 'application/json' } })

let accessToken = ''
let refreshPromise: Promise<string | null> | null = null

export const setAccessToken = (token: string | null) => {
  accessToken = token || ''
  authStorage.setAccessToken(token)
}

const getAccessToken = () => accessToken || authStorage.getAccessToken()
const shouldSkipRefresh = (url?: string) => Boolean(url && /^\/auth\/(login|register-seller|refresh|logout|forgot-password|reset-password|verify-otp)/.test(url))

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
    return token
  } catch {
    return null
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
    const request = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined
    if (error.response?.status === 401 && request && !request._retry && !shouldSkipRefresh(request.url)) {
      request._retry = true
      refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = null })
      const token = await refreshPromise
      if (token) {
        request.headers = request.headers || {}
        request.headers.Authorization = `Bearer ${token}`
        return client(request)
      }
      setAccessToken(null)
      if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    }
    return Promise.reject(toApiError(error))
  },
)

export const api = {
  get: <T>(path: string) => client.get<T>(path).then((response) => response.data),
  post: <T>(path: string, body?: unknown) => client.post<T>(path, body).then((response) => response.data),
  patch: <T>(path: string, body: unknown) => client.patch<T>(path, body).then((response) => response.data),
  delete: <T>(path: string) => client.delete<T>(path).then((response) => response.data),
}
