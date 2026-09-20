import { environment } from '@/config/environment'
import { AUTH_EXPIRED_EVENT } from '@/lib/auth/auth-session'
import { authStorage } from '@/lib/auth/auth-storage'
import { ApiError } from '@/lib/api/errors'

const API_BASE_URL = environment.apiBaseUrl

let accessToken = ''
let refreshPromise: Promise<string | null> | null = null

const readStoredToken = () => authStorage.getAccessToken()

export const setAccessToken = (token: string | null) => {
  accessToken = token || ''
  authStorage.setAccessToken(token)
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(payload?.message || payload?.error?.message || 'Request failed', response.status, payload?.code || payload?.error?.code)
  }
  return (payload?.data ?? payload) as T
}

const refreshAccessToken = async () => {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) return null
  const payload = await response.json().catch(() => ({}))
  const token = payload?.data?.accessToken || payload?.accessToken || null
  setAccessToken(token)
  return token
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  if (!accessToken) accessToken = readStoredToken()
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: 'include' })
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = null })
    const token = await refreshPromise
    if (token) return apiRequest<T>(path, init, false)
    setAccessToken(null)
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
  }
  return parseResponse<T>(response)
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown, headers?: HeadersInit) => apiRequest<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body), headers }),
  patch: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
}

export { API_BASE_URL }
