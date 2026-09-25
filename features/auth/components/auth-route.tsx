'use client'

import { FormEvent, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  Mail,
  LockKeyhole,
  User,
  Store,
  Sparkles,
  Award,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import { authService } from '@/features/auth/services/auth-service'
import { useAuth } from '@/providers/auth-provider'

type Mode = 'login' | 'register' | 'verify' | 'forgot' | 'reset'
type Notice = { type: 'error' | 'success'; text: string } | null

function PasswordField({
  label,
  value,
  onChange,
  error,
  placeholder = '••••••••',
  autoComplete = 'current-password',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  autoComplete?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="auth-field">
      <label className="field-label">
        <span>{label}</span>
      </label>
      <div className="field-input-wrapper">
        <LockKeyhole className="field-prefix-icon" aria-hidden="true" />
        <input
          aria-invalid={Boolean(error)}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="auth-input with-prefix with-suffix"
        />
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((v) => !v)}
          className="field-suffix-btn"
          tabIndex={-1}
        >
          {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
      {error && <small className="field-error-msg">{error}</small>}
    </div>
  )
}

function Strength({ password }: { password: string }) {
  if (!password) return null

  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length

  const levels = [
    { text: 'Too short (min 8 chars)', class: 'level-0' },
    { text: 'Weak — add capital letters', class: 'level-1' },
    { text: 'Fair — add numbers', class: 'level-2' },
    { text: 'Good — add symbols', class: 'level-3' },
    { text: 'Strong password', class: 'level-4' },
  ]
  const current = levels[score]

  return (
    <div className="password-strength-widget" aria-live="polite">
      <div className="strength-track">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`strength-segment ${i <= score ? `active ${levels[score].class}` : ''}`}
          />
        ))}
      </div>
      <span className="strength-caption">{current.text}</span>
    </div>
  )
}

const EMAIL_SESSION_KEY = 'rupakar_seller_auth_email'

export default function AuthRoute() {
  const pathname = usePathname()
  const router = useRouter()
  const { status, refresh } = useAuth()
  const mode: Mode = pathname.includes('register')
    ? 'register'
    : pathname.includes('forgot-password')
    ? 'forgot'
    : pathname.includes('reset-password')
    ? 'reset'
    : pathname.includes('verify')
    ? 'verify'
    : 'login'

  const [form, setForm] = useState({
    emailOrMobile: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    ownerName: '',
    email: '',
    mobile: '',
    otp: '',
  })
  const [rememberMe, setRememberMe] = useState(false)
  const [terms, setTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [done, setDone] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedEmail = window.sessionStorage.getItem(EMAIL_SESSION_KEY)
    if (!savedEmail) return
    if (mode === 'verify' || mode === 'forgot' || mode === 'reset') {
      setForm((current) => ({
        ...current,
        email: current.email || savedEmail,
        emailOrMobile: current.emailOrMobile || savedEmail,
      }))
    }
  }, [mode])

  useEffect(() => {
    if (mode === 'login' && status === 'authenticated') router.replace('/dashboard')
  }, [mode, router, status])

  useEffect(() => {
    if (!seconds) return
    const timer = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [seconds])

  const update = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }))

  const passwordError =
    touched && form.password.length > 0 && form.password.length < 8
      ? 'Password must contain at least 8 characters.'
      : undefined

  const title = {
    login: 'Welcome to Seller Studio',
    register: 'Open Your Seller Studio',
    verify: 'Verify Seller Account',
    forgot: 'Recover Account',
    reset: 'Set New Password',
  }[mode]

  const subtitle = {
    login: 'Sign in to manage your collections, orders, and studio.',
    register: 'Join India’s premier luxury handcrafted marketplace.',
    verify: 'Enter the 6-digit code sent to your contact.',
    forgot: 'Enter your email or mobile to recover your account.',
    reset: 'Choose a strong, secure password for your account.',
  }[mode]

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    setNotice(null)

    if (
      mode === 'register' &&
      (!form.storeName.trim() ||
        !form.ownerName.trim() ||
        !form.email.trim() ||
        !form.mobile.trim() ||
        !form.password ||
        !form.confirmPassword ||
        !terms)
    ) {
      setNotice({
        type: 'error',
        text: 'Please complete all required fields and accept the seller terms.',
      })
      return
    }

    if (mode === 'login' && (!form.emailOrMobile.trim() || !form.password)) {
      setNotice({ type: 'error', text: 'Enter your registered email/mobile and password.' })
      return
    }

    if (mode === 'verify' && form.otp.length !== 6) {
      setNotice({ type: 'error', text: 'Enter the 6-digit verification code.' })
      return
    }

    setLoading(true)
    const result =
      mode === 'login'
        ? await authService.login({
            emailOrMobile: form.emailOrMobile,
            password: form.password,
            rememberMe,
          })
        : mode === 'register'
        ? await authService.register({
            storeName: form.storeName,
            ownerName: form.ownerName,
            email: form.email,
            mobile: form.mobile,
            password: form.password,
            confirmPassword: form.confirmPassword,
            termsAccepted: terms,
          })
        : mode === 'verify'
        ? await authService.verifyOTP({
            otp: form.otp,
            email: form.email || form.emailOrMobile,
          })
        : mode === 'forgot'
        ? await authService.forgotPassword({ emailOrMobile: form.emailOrMobile })
        : await authService.resetPassword({
            newPassword: form.password,
            confirmPassword: form.confirmPassword,
            email: form.email || form.emailOrMobile,
            otp: form.otp,
          })

    setLoading(false)

    if (result.error) {
      setNotice({ type: 'error', text: result.error })
      return
    }

    if (mode === 'login') {
      await refresh()
      setDone(true)
      router.replace('/dashboard')
    } else if (mode === 'register') {
      window.sessionStorage.setItem(EMAIL_SESSION_KEY, form.email)
      setNotice({
        type: 'success',
        text: 'Account created successfully. Please verify your contact to continue.',
      })
      window.setTimeout(() => router.push('/verify'), 900)
    } else if (mode === 'verify') {
      await refresh()
      setDone(true)
      router.replace('/dashboard')
    } else if (mode === 'forgot') {
      window.sessionStorage.setItem(EMAIL_SESSION_KEY, form.emailOrMobile)
      setDone(true)
      setSeconds(300)
    } else {
      setDone(true)
      window.setTimeout(() => router.push('/login'), 1200)
    }
  }

  const resend = async () => {
    if (seconds) return
    setLoading(true)
    const result = await authService.resendOTP(form.email || form.emailOrMobile)
    setLoading(false)
    if (result.error) {
      setNotice({ type: 'error', text: result.error })
    } else {
      setSeconds(result.data.expiresIn)
      setNotice({ type: 'success', text: 'A fresh verification code has been sent.' })
    }
  }

  const isAuthTabMode = mode === 'login' || mode === 'register'

  return (
    <main className="auth-shell">
      <div className={`auth-container ${isAuthTabMode ? 'split-layout' : 'single-layout'}`}>
        {/* Left Editorial Showcase Panel */}
        {isAuthTabMode && (
          <aside className="auth-showcase" aria-hidden="true">
            <div className="showcase-content">
              <div>
                <div className="showcase-brand">
                  <div className="brand-mark">R</div>
                  <div>
                    <b>RUPAKAR</b>
                    <span>SELLER STUDIO</span>
                  </div>
                </div>

                <div className="showcase-badge">
                  <Sparkles className="w-3 h-3 text-[#C89B3C]" />
                  <span>Curated Artisan Marketplace</span>
                </div>

                <div className="showcase-hero">
                  <h2>Where Indian Craftsmanship Meets Modern Commerce</h2>
                  <p>
                    Showcase authentic handcrafted creations to collectors who value heritage, provenance, and master artistry.
                  </p>
                </div>

                <div className="showcase-pillars">
                  <div className="pillar-item">
                    <div className="pillar-icon">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3>Direct-to-Collector Commerce</h3>
                      <p>Fair pricing, transparent settlements, and verified buyers.</p>
                    </div>
                  </div>

                  <div className="pillar-item">
                    <div className="pillar-icon">
                      <Store className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3>Autonomous Studio Tools</h3>
                      <p>Catalog, inventory, order dispatches, and financials in one place.</p>
                    </div>
                  </div>

                  <div className="pillar-item">
                    <div className="pillar-icon">
                      <Award className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3>Verified Heritage Seal</h3>
                      <p>Build consumer trust with verified artisan credentials.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="showcase-footer">
                <div className="showcase-trust">
                  <span>Protected Seller Portal</span>
                  <span>&bull;</span>
                  <span>256-Bit Encrypted</span>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Right Form Card Panel */}
        <section className="auth-card-wrapper">
          <div className="auth-mobile-brand">
            <div className="brand-mark">R</div>
            <div>
              <b>RUPAKAR</b>
              <span>SELLER STUDIO</span>
            </div>
          </div>

          {/* Tab Navigation for Login & Register */}
          {isAuthTabMode && !done && (
            <nav className="auth-nav-tabs" aria-label="Authentication modes">
              <Link
                href="/login"
                className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                aria-current={mode === 'login' ? 'page' : undefined}
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
                aria-current={mode === 'register' ? 'page' : undefined}
              >
                <span className="desktop-text">Create Seller Account</span>
                <span className="mobile-text">Create Account</span>
              </Link>
            </nav>
          )}

          <div className="auth-form-card">
            <header className="auth-card-header">
              <div className="auth-icon-badge">
                {mode === 'verify' ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : mode === 'forgot' || mode === 'reset' ? (
                  <LockKeyhole className="w-4 h-4" />
                ) : mode === 'register' ? (
                  <Store className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="auth-eyebrow">
                  {mode === 'register'
                    ? 'Begin Your Seller Journey'
                    : mode === 'verify'
                    ? 'Two-Step Verification'
                    : mode === 'forgot' || mode === 'reset'
                    ? 'Account Recovery'
                    : 'Seller Access'}
                </p>
                <h1 className="auth-heading">
                  {done
                    ? mode === 'forgot'
                      ? 'Check Your Inbox'
                      : mode === 'reset'
                      ? 'Password Updated'
                      : 'You’re All Set'
                    : title}
                </h1>
                <p className="auth-subheading">
                  {done
                    ? mode === 'forgot'
                      ? 'Reset instructions have been sent.'
                      : 'Request completed successfully.'
                    : subtitle}
                </p>
              </div>
            </header>

            {notice && (
              <div
                className={`auth-notice ${notice.type}`}
                role={notice.type === 'error' ? 'alert' : 'status'}
              >
                {notice.type === 'error' ? (
                  <span className="notice-icon error">!</span>
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#166534]" />
                )}
                <span>{notice.text}</span>
              </div>
            )}

            {!done && (
              <form onSubmit={submit} noValidate className="auth-form">
                {/* Mode: Register Fields */}
                {mode === 'register' && (
                  <div className="form-fields-container">
                    <div className="form-row">
                      <div className="auth-field">
                        <label className="field-label" htmlFor="ownerName">
                          <span>Full name *</span>
                        </label>
                        <div className="field-input-wrapper">
                          <User className="field-prefix-icon" aria-hidden="true" />
                          <input
                            id="ownerName"
                            type="text"
                            value={form.ownerName}
                            onChange={(e) => update('ownerName')(e.target.value)}
                            placeholder="Radhika Sharma"
                            autoComplete="name"
                            className="auth-input with-prefix"
                          />
                        </div>
                      </div>

                      <div className="auth-field">
                        <label className="field-label" htmlFor="storeName">
                          <span>Store name *</span>
                        </label>
                        <div className="field-input-wrapper">
                          <Store className="field-prefix-icon" aria-hidden="true" />
                          <input
                            id="storeName"
                            type="text"
                            value={form.storeName}
                            onChange={(e) => update('storeName')(e.target.value)}
                            placeholder="Atelier Bengal"
                            className="auth-input with-prefix"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="auth-field">
                        <label className="field-label" htmlFor="email">
                          <span>Business email *</span>
                        </label>
                        <div className="field-input-wrapper">
                          <Mail className="field-prefix-icon" aria-hidden="true" />
                          <input
                            id="email"
                            type="email"
                            value={form.email}
                            onChange={(e) => update('email')(e.target.value)}
                            placeholder="artisan@studio.in"
                            autoComplete="email"
                            className="auth-input with-prefix"
                          />
                        </div>
                      </div>

                      <div className="auth-field">
                        <label className="field-label" htmlFor="mobile">
                          <span>Mobile number *</span>
                        </label>
                        <div className="field-input-wrapper">
                          <Smartphone className="field-prefix-icon" aria-hidden="true" />
                          <input
                            id="mobile"
                            type="tel"
                            value={form.mobile}
                            onChange={(e) => update('mobile')(e.target.value)}
                            placeholder="+91 98765 43210"
                            autoComplete="tel"
                            className="auth-input with-prefix"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-row">
                      <PasswordField
                        label="Password *"
                        value={form.password}
                        onChange={update('password')}
                        error={passwordError}
                        placeholder="At least 8 chars"
                        autoComplete="new-password"
                      />

                      <div>
                        <PasswordField
                          label="Confirm password *"
                          value={form.confirmPassword}
                          onChange={update('confirmPassword')}
                          error={
                            touched && form.password !== form.confirmPassword
                              ? 'Passwords do not match.'
                              : undefined
                          }
                          placeholder="Re-enter"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>

                    <Strength password={form.password} />

                    <label className="auth-checkbox-label">
                      <input
                        type="checkbox"
                        checked={terms}
                        onChange={(e) => setTerms(e.target.checked)}
                        className="auth-checkbox"
                      />
                      <span>
                        I agree to the Rupakar Seller Terms and Privacy Policy.
                      </span>
                    </label>
                  </div>
                )}

                {/* Mode: Login & Forgot Identifier */}
                {(mode === 'login' || mode === 'forgot') && (
                  <div className="auth-field">
                    <label className="field-label" htmlFor="emailOrMobile">
                      <span>Email or mobile number</span>
                    </label>
                    <div className="field-input-wrapper">
                      <Mail className="field-prefix-icon" aria-hidden="true" />
                      <input
                        id="emailOrMobile"
                        type="text"
                        value={form.emailOrMobile}
                        onChange={(e) => update('emailOrMobile')(e.target.value)}
                        placeholder="you@business.in or +91 98765 43210"
                        autoComplete="username"
                        className="auth-input with-prefix"
                      />
                    </div>
                  </div>
                )}

                {/* Mode: Verify OTP */}
                {mode === 'verify' && (
                  <div className="verify-block">
                    <div className="verify-destination-card">
                      <Smartphone className="w-3.5 h-3.5 text-[#b94d25]" />
                      <span>Code sent to registered contact</span>
                    </div>

                    <div className="auth-field">
                      <label className="field-label" htmlFor="otp">
                        <span>6-digit verification code</span>
                      </label>
                      <input
                        id="otp"
                        className="otp-code-input"
                        inputMode="numeric"
                        maxLength={6}
                        value={form.otp}
                        onChange={(e) => update('otp')(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        autoComplete="one-time-code"
                      />
                    </div>
                  </div>
                )}

                {/* Mode: Login Password */}
                {mode === 'login' && (
                  <>
                    <PasswordField
                      label="Password"
                      value={form.password}
                      onChange={update('password')}
                      error={passwordError}
                      autoComplete="current-password"
                    />

                    <div className="auth-row-options">
                      <label className="auth-checkbox-label">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="auth-checkbox"
                        />
                        <span>
                          <span className="desktop-text">Remember me for 30 days</span>
                          <span className="mobile-text">Remember me</span>
                        </span>
                      </label>
                      <Link href="/forgot-password" className="auth-link-subtle">
                        Forgot password?
                      </Link>
                    </div>
                  </>
                )}

                {/* Mode: Reset Password */}
                {mode === 'reset' && (
                  <>
                    <PasswordField
                      label="New password"
                      value={form.password}
                      onChange={update('password')}
                      error={passwordError}
                      placeholder="At least 8 chars"
                      autoComplete="new-password"
                    />
                    <Strength password={form.password} />
                    <PasswordField
                      label="Confirm new password"
                      value={form.confirmPassword}
                      onChange={update('confirmPassword')}
                      error={
                        touched && form.password !== form.confirmPassword
                          ? 'Passwords do not match.'
                          : undefined
                      }
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                    />
                  </>
                )}

                <button
                  type="submit"
                  className="primary-button auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Please wait…</span>
                    </>
                  ) : mode === 'login' ? (
                    <>
                      <span className="desktop-text">Sign In to Seller Studio</span>
                      <span className="mobile-text">Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  ) : mode === 'register' ? (
                    <>
                      <span className="desktop-text">Create Seller Account</span>
                      <span className="mobile-text">Create Account</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  ) : mode === 'forgot' ? (
                    <span>Send Reset Instructions</span>
                  ) : mode === 'reset' ? (
                    <span>Update Password</span>
                  ) : (
                    <span>Verify & Continue</span>
                  )}
                </button>
              </form>
            )}

            {mode === 'verify' && !done && (
              <div className="auth-secondary-actions">
                <button
                  type="button"
                  onClick={resend}
                  disabled={loading || Boolean(seconds)}
                  className="resend-btn"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>
                    Resend code{' '}
                    {seconds
                      ? `(${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')})`
                      : ''}
                  </span>
                </button>
                <Link href="/register" className="auth-link-subtle">
                  Change email / mobile
                </Link>
              </div>
            )}

            <footer className="auth-card-footer">
              {mode === 'login' && (
                <p>
                  New to Rupakar?{' '}
                  <Link href="/register" className="auth-link-accent">
                    Create your seller account
                  </Link>
                </p>
              )}
              {mode === 'register' && (
                <p>
                  Already registered as a seller?{' '}
                  <Link href="/login" className="auth-link-accent">
                    Sign in to your studio
                  </Link>
                </p>
              )}
              {(mode === 'forgot' || mode === 'reset' || mode === 'verify') && (
                <Link href="/login" className="auth-back-link">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to sign in</span>
                </Link>
              )}
            </footer>
          </div>
        </section>
      </div>

      <p className="auth-footer-tagline">
        Rupakar Artisan Merchant Platform &middot; Authentic Indian Heritage
      </p>
    </main>
  )
}

export const dynamic = 'force-dynamic'
