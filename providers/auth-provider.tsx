'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { api, setAccessToken } from '@/lib/api/client'
import { AUTH_EXPIRED_EVENT } from '@/lib/auth/auth-session'
import { profileService } from '@/features/profile/services/profile-service'
import type { UserProfile, VendorProfile } from '@/features/profile/types/profile.types'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'seller-pending' | 'seller-rejected' | 'seller-suspended'
type AuthContextValue = { user?: UserProfile; vendor?: VendorProfile; status: AuthStatus; error?: string; refresh: () => Promise<void>; logout: () => Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null)
const sellerPaths = ['/dashboard', '/products', '/inventory', '/orders', '/finance', '/reviews', '/analytics', '/store', '/verification', '/notifications', '/support', '/settings', '/profile']

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserProfile>()
  const [vendor, setVendor] = useState<VendorProfile>()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [error, setError] = useState<string>()
  const isSellerPath = sellerPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))

  const refresh = async () => {
    setStatus('loading'); setError(undefined)
    try {
      const data = await profileService.getSellerProfile()
      setUser(data.user); setVendor(data.vendor)
      if (data.vendor.status === 'SUSPENDED' || data.vendor.status === 'BLOCKED') setStatus('seller-suspended')
      else if (data.vendor.status === 'REJECTED') setStatus('seller-rejected')
      else if (data.vendor.status === 'APPROVED') setStatus('authenticated')
      else setStatus('seller-pending')
    } catch (cause) {
      const authError = cause as Error & { status?: number }
      setUser(undefined); setVendor(undefined)
      if (authError.status === 401 || authError.status === 404) setStatus('unauthenticated')
      else { setStatus('unauthenticated'); setError(authError.message) }
    }
  }

  const logout = async () => { try { await api.post('/auth/logout') } finally { setAccessToken(null); setUser(undefined); setVendor(undefined); setStatus('unauthenticated'); router.replace('/login') } }

  useEffect(() => { void refresh() }, [])
  useEffect(() => { const handleExpired = () => { setUser(undefined); setVendor(undefined); setStatus('unauthenticated'); if (isSellerPath) router.replace('/login') }; window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired); return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired) }, [isSellerPath, router])

  const value = useMemo(() => ({ user, vendor, status, error, refresh, logout }), [user, vendor, status, error])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used within AuthProvider'); return context }

export function SellerAuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const router = useRouter()
  useEffect(() => { if (status === 'unauthenticated') router.replace('/login') }, [status, router])
  if (status === 'loading' || status === 'unauthenticated') return <main className="auth-shell" aria-live="polite"><p className="subtle">Checking your seller session…</p></main>
  if (status !== 'authenticated') return <main className="auth-shell"><section className="auth-card"><p className="eyebrow">Seller access</p><h1>Seller access needs review</h1><p className="subtle">Your account does not currently have an approved seller relationship.</p></section></main>
  return <>{children}</>
}
