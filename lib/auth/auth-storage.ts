const ACCESS_TOKEN_KEY = 'rupakar_access_token'

let accessToken = ''

export const authStorage = {
  getAccessToken(): string {
    if (typeof window !== 'undefined') {
      try {
        const storedToken = window.localStorage.getItem(ACCESS_TOKEN_KEY)
        if (storedToken) accessToken = storedToken
      } catch {
        // Ignore storage access issues and fall back to the in-memory value.
      }
    }
    return accessToken
  },
  setAccessToken(token: string | null) {
    accessToken = token || ''
    if (typeof window !== 'undefined') {
      try {
        if (accessToken) window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
        else window.localStorage.removeItem(ACCESS_TOKEN_KEY)
      } catch {
        // Ignore storage access issues; the in-memory token still works for the current session.
      }
    }
  },
}
