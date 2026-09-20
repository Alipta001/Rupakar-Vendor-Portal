'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ShieldCheck, UserRound } from 'lucide-react'
import { profileService } from '@/features/profile/services/profile-service'
import type { SellerProfileData } from '@/features/profile/types/profile.types'

export default function ProfilePage() {
  const [profile, setProfile] = useState<SellerProfileData>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', businessName: '' })

  useEffect(() => { profileService.getSellerProfile().then((data) => { setProfile(data); setForm({ name: data.user.name, email: data.user.email, phone: data.user.phone, businessName: data.vendor.businessName }) }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load profile')).finally(() => setLoading(false)) }, [])
  const save = async () => { setSaving(true); setError(''); setMessage(''); try { const [user, vendor] = await Promise.all([profileService.updateUserProfile({ name: form.name, email: form.email, phone: form.phone }), profileService.updateVendorProfile({ businessName: form.businessName })]); setProfile((current) => current ? { user, vendor } : undefined); setEditing(false); setMessage('Profile updated successfully.') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update profile') } finally { setSaving(false) } }
  if (loading) return <main className="workspace"><p className="subtle">Loading profile…</p></main>
  if (!profile) return <main className="workspace"><div className="auth-notice error" role="alert">{error || 'Profile unavailable.'}</div></main>
  return <main className="workspace"><div className="welcome-row"><div><p className="eyebrow">Account</p><h1>Profile & security</h1><p className="subtle">Manage your seller identity and business profile.</p></div>{editing ? <div><button className="secondary-button" onClick={() => setEditing(false)}>Cancel</button> <button className="primary-button" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button></div> : <button className="secondary-button" onClick={() => setEditing(true)}>Edit profile</button>}</div>{message && <div className="auth-notice success" role="status"><CheckCircle2 />{message}</div>}{error && <div className="auth-notice error" role="alert">{error}</div>}<div className="profile-grid"><section className="panel profile-card"><h2>Seller profile</h2><div className="profile-identity"><div className="profile-avatar">{profile.user.name.slice(0, 2).toUpperCase()}</div><div><b>{profile.user.name}</b><span>{profile.vendor.businessName}</span></div></div>{editing ? <div className="profile-list"><label><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label><span>Phone</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label><span>Business name</span><input value={form.businessName} onChange={(event) => setForm({ ...form, businessName: event.target.value })} /></label></div> : <div className="profile-list"><div><span>Email</span><b>{profile.user.email}</b></div><div><span>Mobile</span><b>{profile.user.phone || 'Not provided'}</b></div><div><span>Seller role</span><b>{profile.user.role}</b></div><div><span>Verification</span><b><span className="status-badge success"><ShieldCheck /> {profile.vendor.verificationStatus}</span></b></div><div><span>Account status</span><b>{profile.vendor.status}</b></div><div><span>Joined date</span><b>{profile.user.createdAt || 'Not available'}</b></div></div>}</section><section className="panel profile-card"><h2>Security</h2><div className="profile-list"><div><span><UserRound /> Email verification</span><b>{profile.user.isVerified ? 'Verified' : 'Pending'}</b></div><div><span><ShieldCheck /> Seller verification</span><b>{profile.vendor.verificationStatus}</b></div><div><span>Session security</span><b>Refresh cookie protected</b></div></div></section></div></main>
}
