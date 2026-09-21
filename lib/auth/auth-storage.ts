let accessToken = ''

export const authStorage = {
  getAccessToken(): string {
    return accessToken
  },
  setAccessToken(token: string | null) {
    accessToken = token || ''
  },
}
