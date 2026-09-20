export const AUTH_EXPIRED_EVENT = 'rupakar:auth-expired'

export const onAuthExpired = (listener: () => void) => {
  if (typeof window === 'undefined') return () => undefined
  window.addEventListener(AUTH_EXPIRED_EVENT, listener)
  return () => window.removeEventListener(AUTH_EXPIRED_EVENT, listener)
}
