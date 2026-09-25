'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Clock, RefreshCw, LogOut } from 'lucide-react'
import { api, setAccessToken } from '@/api'
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
  const { status, refresh, logout } = useAuth()
  const router = useRouter()
  const [checking, setChecking] = useState(false)

  const handleRefresh = async () => {
    setChecking(true)
    try {
      await refresh()
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => { if (status === 'unauthenticated') router.replace('/login') }, [status, router])
  if (status === 'loading' || status === 'unauthenticated') return <main className="auth-shell" aria-live="polite"><p className="subtle">Checking your seller session…</p></main>
  if (status !== 'authenticated') {
    return (
      <main className="auth-shell">
        <div className="auth-brand">
          <div className="brand-mark">R</div>
          <div>
            <b>RUPAKAR</b>
            <span>SELLER STUDIO</span>
          </div>
        </div>
        <section className="auth-card pending-approval-card">
          <div className="pending-badge">
            <span className="pulse-dot" />
            <span>Verification In Progress</span>
          </div>
          <div className="auth-icon pending-icon">
            <Clock className="w-5 h-5 text-[#b94d25]" />
          </div>
          <p className="eyebrow">Seller Account Status</p>
          <h1>Seller Account Pending Approval</h1>
          <p className="subtle">
            Your seller account has been created successfully, but it is waiting for approval. Once your account is approved, you will be able to access the seller dashboard.
          </p>

          <div className="pending-steps" aria-label="Approval process steps">
            <div className="pending-step completed">
              <span className="step-num">✓</span>
              <div>
                <strong>Registration Received</strong>
                <p>Your seller profile and credentials have been recorded.</p>
              </div>
            </div>
            <div className="pending-step active">
              <span className="step-num">2</span>
              <div>
                <strong>Artisan Curation & Review</strong>
                <p>Our team verifies your craft lineage and store details.</p>
              </div>
            </div>
            <div className="pending-step upcoming">
              <span className="step-num">3</span>
              <div>
                <strong>Studio Activation</strong>
                <p>You can list products, manage inventory, and fulfill orders.</p>
              </div>
            </div>
          </div>

          <div className="pending-actions">
            <button
              type="button"
              className="primary-button"
              onClick={handleRefresh}
              disabled={checking}
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking Status…' : 'Check Approval Status'}</span>
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          <p className="pending-help">
            Have questions about your onboarding? Write to us at{' '}
            <a href="mailto:rupakarsupport@gmail.com">rupakarsupport@gmail.com</a>
          </p>
        </section>
        <p className="auth-footer">Protected seller access · RUPAKAR Marketplace</p>
      </main>
    )
  }
  return <>{children}</>
}
