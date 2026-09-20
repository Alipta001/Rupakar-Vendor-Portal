export const environment = {
  apiBaseUrl: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace(/\/$/, ''),
} as const
