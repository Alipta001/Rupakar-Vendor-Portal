'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowLeft, CheckCircle2, ShieldCheck, Smartphone, Mail, LockKeyhole } from 'lucide-react'
import { authService } from '@/features/auth/services/auth-service'

type Mode = 'login' | 'register' | 'verify' | 'forgot' | 'reset'
type Notice = { type: 'error' | 'success'; text: string } | null

function PasswordField({ label, value, onChange, error }: { label: string; value: string; onChange: (value: string) => void; error?: string }) {
  const [visible, setVisible] = useState(false)
  return <label className="auth-field"><span>{label}</span><div className="password-input"><input aria-invalid={Boolean(error)} type={visible ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} autoComplete="new-password" /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff /> : <Eye />}</button></div>{error && <small className="field-error">{error}</small>}</label>
}

function Strength({ password }: { password: string }) {
  const score = [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length
  const labels = ['Too short', 'Weak', 'Good', 'Strong', 'Very strong']
  return <div className="password-strength" aria-live="polite"><div className="strength-bars">{[1, 2, 3, 4].map(i => <i key={i} className={i <= score ? 'filled' : ''} />)}</div><span>{password ? labels[score] : 'Use 8+ characters with numbers and symbols'}</span></div>
}

export default function AuthRoute() {
  const pathname = usePathname()
  const router = useRouter()
  const mode: Mode = pathname.includes('register') ? 'register' : pathname.includes('forgot-password') ? 'forgot' : pathname.includes('reset-password') ? 'reset' : pathname.includes('verify') ? 'verify' : 'login'
  const [form, setForm] = useState({ emailOrMobile: '', password: '', confirmPassword: '', storeName: '', ownerName: '', email: '', mobile: '', otp: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [terms, setTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [done, setDone] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [touched, setTouched] = useState(false)

  useEffect(() => { if (!seconds) return; const timer = window.setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000); return () => window.clearInterval(timer) }, [seconds])
  const update = (key: keyof typeof form) => (value: string) => setForm(current => ({ ...current, [key]: value }))
  const passwordError = touched && form.password.length > 0 && form.password.length < 8 ? 'Use at least 8 characters.' : undefined
  const title = { login: 'Welcome back', register: 'Create your seller account', verify: 'Verify your account', forgot: 'Recover your account', reset: 'Set a new password' }[mode]
  const subtitle = { login: 'Sign in to manage your store, orders, and earnings.', register: 'Join a trusted marketplace for India’s finest craft.', verify: 'Enter the 6-digit code sent to your contact.', forgot: 'We will send a secure reset link to your account.', reset: 'Choose a strong password for your seller account.' }[mode]
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setTouched(true); setNotice(null)
    if (mode === 'register' && (!form.storeName || !form.ownerName || !form.email || !form.mobile || !form.password || !form.confirmPassword || !terms)) { setNotice({ type: 'error', text: 'Complete all required fields and accept the terms.' }); return }
    if (mode === 'login' && (!form.emailOrMobile || !form.password)) { setNotice({ type: 'error', text: 'Enter your email/mobile and password.' }); return }
    if (mode === 'verify' && form.otp.length !== 6) { setNotice({ type: 'error', text: 'Enter the 6-digit verification code.' }); return }
    setLoading(true)
    const result = mode === 'login' ? await authService.login({ emailOrMobile: form.emailOrMobile, password: form.password, rememberMe }) : mode === 'register' ? await authService.register({ storeName: form.storeName, ownerName: form.ownerName, email: form.email, mobile: form.mobile, password: form.password, confirmPassword: form.confirmPassword, termsAccepted: terms }) : mode === 'verify' ? await authService.verifyOTP({ otp: form.otp, email: form.email || form.emailOrMobile }) : mode === 'forgot' ? await authService.forgotPassword({ emailOrMobile: form.emailOrMobile }) : await authService.resetPassword({ newPassword: form.password, confirmPassword: form.confirmPassword, email: form.email || form.emailOrMobile, otp: form.otp })
    setLoading(false)
    if (result.error) { setNotice({ type: 'error', text: result.error }); return }
    if (mode === 'login') { setDone(true); window.setTimeout(() => router.push('/'), 700) }
    else if (mode === 'register') { setNotice({ type: 'success', text: 'Account created. Verify your contact to continue.' }); window.setTimeout(() => router.push('/verify'), 900) }
    else if (mode === 'verify') { setDone(true); window.setTimeout(() => router.push('/'), 700) }
    else if (mode === 'forgot') { setDone(true); setSeconds(300) }
    else { setDone(true); window.setTimeout(() => router.push('/login'), 1200) }
  }
  const resend = async () => { if (seconds) return; setLoading(true); const result = await authService.resendOTP(form.email || form.emailOrMobile); setLoading(false); if (result.error) setNotice({ type: 'error', text: result.error }); else { setSeconds(result.data.expiresIn); setNotice({ type: 'success', text: 'A new verification code has been sent.' }) } }
  return <main className="auth-shell"><div className="auth-brand"><div className="brand-mark">R</div><div><b>RUPAKAR</b><span>SELLER STUDIO</span></div></div><section className="auth-card"><div className="auth-icon">{mode === 'verify' ? <ShieldCheck /> : mode === 'forgot' || mode === 'reset' ? <LockKeyhole /> : <Mail />}</div><p className="eyebrow">{mode === 'register' ? 'Begin your seller journey' : 'Seller access'}</p><h1>{done ? (mode === 'forgot' ? 'Check your inbox' : mode === 'reset' ? 'Password updated' : 'You’re all set') : title}</h1><p className="subtle">{done ? (mode === 'forgot' ? 'If an account exists, we sent reset instructions.' : 'Your request was completed successfully.') : subtitle}</p>{notice && <div className={`auth-notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.type === 'error' ? '!' : <CheckCircle2 />}{notice.text}</div>}{!done && <form onSubmit={submit} noValidate>{mode === 'register' && <><label className="auth-field"><span>Full name</span><input value={form.ownerName} onChange={e => update('ownerName')(e.target.value)} placeholder="Ananya Sen" autoComplete="name" /></label><label className="auth-field"><span>Store / business name</span><input value={form.storeName} onChange={e => update('storeName')(e.target.value)} placeholder="Atelier Bengal" /></label><label className="auth-field"><span>Email</span><input type="email" value={form.email} onChange={e => update('email')(e.target.value)} placeholder="you@business.in" autoComplete="email" /></label><label className="auth-field"><span>Mobile number</span><input type="tel" value={form.mobile} onChange={e => update('mobile')(e.target.value)} placeholder="+91 98765 43210" autoComplete="tel" /></label></>}{(mode === 'login' || mode === 'forgot') && <label className="auth-field"><span>Email or mobile</span><input type="text" value={form.emailOrMobile} onChange={e => update('emailOrMobile')(e.target.value)} placeholder="you@business.in" autoComplete="username" /></label>}{mode === 'verify' && <><div className="verify-destination"><Smartphone /> Code sent to your registered contact</div><label className="auth-field"><span>6-digit verification code</span><input className="otp-input" inputMode="numeric" maxLength={6} value={form.otp} onChange={e => update('otp')(e.target.value.replace(/\D/g, ''))} placeholder="000000" autoComplete="one-time-code" /></label></>}{(mode === 'login' || mode === 'register' || mode === 'reset') && <><PasswordField label={mode === 'reset' ? 'New password' : 'Password'} value={form.password} onChange={update('password')} error={passwordError} />{(mode === 'register' || mode === 'reset') && <><Strength password={form.password} /><PasswordField label="Confirm password" value={form.confirmPassword} onChange={update('confirmPassword')} error={touched && form.password !== form.confirmPassword ? 'Passwords do not match.' : undefined} /></>}</>}{mode === 'register' && <label className="checkbox-label"><input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} /> <span>I agree to the seller terms and privacy policy</span></label>}{mode === 'login' && <div className="auth-options"><label className="checkbox-label"><input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} /><span>Remember me</span></label><a href="/forgot-password">Forgot password?</a></div>}<button className="primary-button auth-submit" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create seller account' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Update password' : 'Verify & continue'}</button></form>}{mode === 'verify' && !done && <div className="auth-secondary-actions"><button type="button" onClick={resend} disabled={loading || Boolean(seconds)}>Resend code {seconds ? `in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : ''}</button><a href={mode === 'verify' ? '/register' : '/login'}>Change email/mobile</a></div>}<div className="auth-links">{mode === 'login' && <a href="/register">Create seller account</a>}{mode === 'register' && <a href="/login">Already have an account? Sign in</a>}{(mode === 'forgot' || mode === 'reset' || mode === 'verify') && <a href="/login"><ArrowLeft /> Back to sign in</a>}</div></section><p className="auth-footer">Protected seller access · RUPAKAR Marketplace</p></main>
}

export const dynamic = 'force-dynamic'
