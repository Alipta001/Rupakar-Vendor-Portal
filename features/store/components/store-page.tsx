'use client'

import { CheckCircle2, Globe, Mail, MapPin, Phone, RefreshCw, ShieldCheck, Store, Wand2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { profileService } from '@/features/profile/services/profile-service'
import type { VendorProfile } from '@/features/profile/types/profile.types'

type StoreForm = {
  businessName: string
  description: string
  email: string
  phone: string
  website: string
  address: string
}

const buildForm = (vendor: VendorProfile): StoreForm => ({
  businessName: vendor.businessName || '',
  description: vendor.description || '',
  email: vendor.email || '',
  phone: vendor.phone || '',
  website: vendor.website || '',
  address: vendor.address || '',
})

export default function StorePage() {
  const [vendor, setVendor] = useState<VendorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<StoreForm>({ businessName: '', description: '', email: '', phone: '', website: '', address: '' })

  const loadVendor = async () => {
    setLoading(true)
    setError('')
    try {
      const profile = await profileService.getSellerProfile()
      setVendor(profile.vendor)
      setForm(buildForm(profile.vendor))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your store.')
      setVendor(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadVendor()
  }, [])

  const save = async () => {
    if (!form.businessName.trim()) {
      setError('Business name is required.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const updatedVendor = await profileService.updateVendorProfile({
        businessName: form.businessName.trim(),
        description: form.description.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        website: form.website.trim(),
        address: form.address.trim(),
      })
      setVendor(updatedVendor)
      setForm(buildForm(updatedVendor))
      setEditing(false)
      setMessage('Store details saved successfully.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update your store.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="workspace">
        <p className="subtle">Loading store details…</p>
      </main>
    )
  }

  if (!vendor) {
    return (
      <main className="workspace">
        <div className="auth-notice error" role="alert">{error || 'Store information is unavailable.'}</div>
      </main>
    )
  }

  return (
    <main className="workspace">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">Storefront</p>
          <h1>{vendor.businessName}</h1>
          <p className="subtle">Manage how your store appears to customers and how buyers can reach you.</p>
        </div>
        <div>
          <button className="secondary-button" onClick={() => void loadVendor()} disabled={loading}>
            <RefreshCw className="icon-inline" /> Refresh
          </button>
          {editing ? (
            <>
              <button className="secondary-button" onClick={() => { setEditing(false); setError(''); setMessage(''); setForm(buildForm(vendor)) }}>
                Cancel
              </button>
              <button className="primary-button" disabled={saving} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          ) : (
            <button className="primary-button" onClick={() => setEditing(true)}>
              <Wand2 className="icon-inline" /> Edit store
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="auth-notice success" role="status">
          <CheckCircle2 /> {message}
        </div>
      )}
      {error && (
        <div className="auth-notice error" role="alert">
          {error}
        </div>
      )}

      <div className="profile-grid">
        <section className="panel profile-card">
          <h2>Store information</h2>
          {editing ? (
            <div className="profile-list">
              <label>
                <span>Business name</span>
                <input value={form.businessName} onChange={(event) => setForm((current) => ({ ...current, businessName: event.target.value }))} />
              </label>
              <label>
                <span>Store description</span>
                <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={5} />
              </label>
              <label>
                <span>Email</span>
                <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label>
                <span>Phone</span>
                <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              </label>
              <label>
                <span>Website</span>
                <input value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} placeholder="https://example.com" />
              </label>
              <label>
                <span>Store address</span>
                <textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} rows={4} />
              </label>
            </div>
          ) : (
            <div className="profile-list">
              <div>
                <span>Store description</span>
                <b>{vendor.description || 'No description added yet.'}</b>
              </div>
              <div>
                <span>Email</span>
                <b>{vendor.email || 'Not provided'}</b>
              </div>
              <div>
                <span>Phone</span>
                <b>{vendor.phone || 'Not provided'}</b>
              </div>
              <div>
                <span>Website</span>
                <b>{vendor.website || 'Not provided'}</b>
              </div>
              <div>
                <span>Address</span>
                <b>{vendor.address || 'Not provided'}</b>
              </div>
            </div>
          )}
        </section>

        <section className="panel profile-card">
          <h2>Store status</h2>
          <div className="profile-list">
            <div>
              <span>Approval status</span>
              <b><span className="status-badge success"><ShieldCheck /> {vendor.status}</span></b>
            </div>
            <div>
              <span>Verification</span>
              <b><span className="status-badge success"><ShieldCheck /> {vendor.verificationStatus}</span></b>
            </div>
            <div>
              <span>Storefront visibility</span>
              <b>{vendor.status === 'APPROVED' ? 'Visible to shoppers' : 'Managed in seller workspace'}</b>
            </div>
            <div>
              <span>Business type</span>
              <b>{vendor.businessType || 'INDIVIDUAL'}</b>
            </div>
          </div>
          <div className="empty-state compact">
            <Store />
            <div>
              <b>{vendor.status === 'APPROVED' ? 'Your store is live' : 'Your store is still in review'}</b>
              <p>{vendor.status === 'APPROVED' ? 'Customers can discover your storefront once the approval status is active.' : 'Keep your store details complete while the seller account is being reviewed.'}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
