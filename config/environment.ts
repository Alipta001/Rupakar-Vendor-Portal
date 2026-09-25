const LOCAL_API_BASE_URL = 'http://localhost:4000/api/v1'
const PRODUCTION_API_BASE_URL = 'https://api.rupakar.com/api/v1'

const resolveApiBaseUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (configuredUrl && !configuredUrl.includes(',')) {
    return configuredUrl.replace(/\/$/, '')
  }
  if (process.env.NODE_ENV === 'production') return PRODUCTION_API_BASE_URL
  return LOCAL_API_BASE_URL
}

export const environment = {
  apiBaseUrl: resolveApiBaseUrl(),
} as const
