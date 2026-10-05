'use client'

import { useEffect, useState } from 'react'
import { LockKeyhole, MapPin, Save, ShieldCheck, Truck, Edit2, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { profileService } from '@/features/profile/services/profile-service'
import type { SellerProfileData, VendorPickupAddress } from '@/features/profile/types/profile.types'

const emptyAddress: VendorPickupAddress = {
  pickupLocationName: '',
  contactPerson: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'account' | 'pickup' | 'security'>('account')
  const [profile, setProfile] = useState<SellerProfileData>()
  const [form, setForm] = useState({ name: '', email: '', phone: '', businessName: '' })
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  
  // Pickup Address state
  const [pickupAddress, setPickupAddress] = useState<VendorPickupAddress | null>(null)
  const [addressForm, setAddressForm] = useState<VendorPickupAddress>(emptyAddress)
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({})

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string }>()

  useEffect(() => {
    // Check URL query parameter for tab selection (e.g. ?tab=pickup)
    if (typeof window !== 'undefined') {
      const tab = new URLSearchParams(window.location.search).get('tab')
      if (tab === 'pickup' || tab === 'security' || tab === 'account') {
        setActiveTab(tab)
      }
    }

    Promise.all([
      profileService.getSellerProfile(),
      profileService.getPickupAddress().catch(() => null),
    ])
      .then(([data, addr]) => {
        setProfile(data)
        setForm({
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone,
          businessName: data.vendor.businessName,
        })
        const existingAddr = addr || data.vendor.pickupAddress || null
        if (existingAddr && existingAddr.pincode) {
          setPickupAddress(existingAddr)
          setAddressForm(existingAddr)
          setIsEditingAddress(false)
        } else {
          setPickupAddress(null)
          // Prefill defaults from vendor profile
          setAddressForm({
            ...emptyAddress,
            pickupLocationName: data.vendor.businessName ? `${data.vendor.businessName} Warehouse` : 'Primary Hub',
            contactPerson: data.user.name || '',
            phone: data.user.phone || data.vendor.phone || '',
            addressLine1: data.vendor.address || '',
          })
          setIsEditingAddress(false)
        }
      })
      .catch((error) =>
        setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to load settings' })
      )
      .finally(() => setLoading(false))
  }, [])

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setNotice(undefined)
    try {
      const [user, vendor] = await Promise.all([
        profileService.updateUserProfile({ name: form.name, email: form.email, phone: form.phone }),
        profileService.updateVendorProfile({ businessName: form.businessName }),
      ])
      setProfile({ user, vendor })
      setNotice({ type: 'success', text: 'Account and store settings saved.' })
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const validateAddress = (): boolean => {
    const errors: Record<string, string> = {}
    if (!addressForm.pickupLocationName.trim()) {
      errors.pickupLocationName = 'Pickup location name is required (e.g. Primary Hub)'
    }
    if (!addressForm.contactPerson.trim()) {
      errors.contactPerson = 'Contact person name is required'
    }
    const cleanPhone = addressForm.phone.trim().replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]/.test(cleanPhone)) {
      errors.phone = 'Please enter a valid 10-digit Indian mobile number'
    }
    if (!addressForm.addressLine1.trim() || addressForm.addressLine1.trim().length < 3) {
      errors.addressLine1 = 'Address line 1 is required (min 3 characters)'
    }
    if (!addressForm.city.trim()) {
      errors.city = 'City is required'
    }
    if (!addressForm.state.trim()) {
      errors.state = 'State is required'
    }
    const cleanPin = addressForm.pincode.trim()
    if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      errors.pincode = 'Please enter a valid 6-digit Indian pincode'
    }

    setAddressErrors(errors)
    return Object.keys(errors).length === 0
  }

  const savePickupAddress = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validateAddress()) return

    setSavingAddress(true)
    setNotice(undefined)
    try {
      const payload: VendorPickupAddress = {
        pickupLocationName: addressForm.pickupLocationName.trim(),
        contactPerson: addressForm.contactPerson.trim(),
        phone: addressForm.phone.trim().replace(/\D/g, '').slice(-10),
        addressLine1: addressForm.addressLine1.trim(),
        addressLine2: addressForm.addressLine2?.trim() || '',
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        pincode: addressForm.pincode.trim(),
        country: addressForm.country?.trim() || 'India',
      }

      const updated = await profileService.updatePickupAddress(payload)
      setPickupAddress(updated)
      setAddressForm(updated)
      setIsEditingAddress(false)
      setNotice({ type: 'success', text: 'Pickup / dispatch address saved successfully. Carriers will use this location for pickups.' })
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to save pickup address' })
    } finally {
      setSavingAddress(false)
    }
  }

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setNotice(undefined)
    if (password.newPassword !== password.confirmPassword) {
      setNotice({ type: 'error', text: 'New passwords do not match.' })
      return
    }
    if (password.newPassword.length < 8) {
      setNotice({ type: 'error', text: 'New password must be at least 8 characters.' })
      return
    }
    setSaving(true)
    try {
      await profileService.changePassword(password.currentPassword, password.newPassword)
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setNotice({ type: 'success', text: 'Password changed. Other active sessions were signed out.' })
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to change password' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="workspace">
        <p className="subtle">Loading settings…</p>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="workspace">
        <div className="auth-notice error">{notice?.text || 'Settings unavailable.'}</div>
      </main>
    )
  }

  return (
    <main className="workspace settings-page space-y-6">
      <PageHeader
        eyebrow="Account controls"
        title="Settings"
        description="Manage your account details, store identity, dispatch warehouse address, and session security."
      />

      {notice && (
        <div className={`auth-notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="tabs inventory-tabs mb-6 flex border-b border-[#E6D8C4] gap-2">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'account'
              ? 'border-[#8B5E34] text-[#8B5E34]'
              : 'border-transparent text-[#7A655A] hover:text-[#1E1A17]'
          }`}
          onClick={() => { setActiveTab('account'); setNotice(undefined) }}
        >
          Account & Store
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'pickup'
              ? 'border-[#8B5E34] text-[#8B5E34]'
              : 'border-transparent text-[#7A655A] hover:text-[#1E1A17]'
          }`}
          onClick={() => { setActiveTab('pickup'); setNotice(undefined) }}
        >
          <Truck className="h-4 w-4" /> Pickup / Dispatch Address
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'security'
              ? 'border-[#8B5E34] text-[#8B5E34]'
              : 'border-transparent text-[#7A655A] hover:text-[#1E1A17]'
          }`}
          onClick={() => { setActiveTab('security'); setNotice(undefined) }}
        >
          <LockKeyhole className="h-4 w-4" /> Security
        </button>
      </div>

      {/* Tab 1: Account and Store */}
      {activeTab === 'account' && (
        <div className="settings-grid">
          <section className="panel profile-card">
            <div className="panel-heading">
              <div>
                <h2>Account and store</h2>
                <p>These details are saved to your seller account.</p>
              </div>
              <ShieldCheck className="heading-icon" />
            </div>
            <form className="settings-form" onSubmit={saveProfile}>
              <label>
                <span>Full name</span>
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </label>
              <label>
                <span>Phone</span>
                <input
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </label>
              <label>
                <span>Business name</span>
                <input
                  required
                  value={form.businessName}
                  onChange={(event) => setForm({ ...form, businessName: event.target.value })}
                />
              </label>
              <button className="primary-button" disabled={saving}>
                <Save /> {saving ? 'Saving…' : 'Save account settings'}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* Tab 2: Pickup / Dispatch Address */}
      {activeTab === 'pickup' && (
        <div className="settings-grid">
          <section className="panel profile-card">
            <div className="panel-heading flex justify-between items-start">
              <div>
                <h2>Pickup / Dispatch Address</h2>
                <p className="subtle text-xs text-[#5D4A3C] mt-1">
                  Logistics partners (such as Shiprocket) require this registered pickup address to schedule carrier pickups, calculate shipping rates, and generate valid consignment labels.
                </p>
              </div>
              <MapPin className="heading-icon text-[#8B5E34]" />
            </div>

            {/* Read-Only View Mode */}
            {!isEditingAddress && pickupAddress && (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-[#E6D8C4] bg-[#FCF8F3] p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[#E6D8C4] gap-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-[#8B5E34]" />
                      <span className="font-bold text-[#1E1A17] text-base">
                        {pickupAddress.pickupLocationName}
                      </span>
                    </div>
                    <span className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#EADECC] text-[#5D4A3C]">
                      Active Dispatch Hub
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#7A655A] font-semibold">Contact Person</p>
                      <p className="mt-1 font-medium text-[#1E1A17]">{pickupAddress.contactPerson}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#7A655A] font-semibold">Contact Phone</p>
                      <p className="mt-1 font-medium text-[#1E1A17]">{pickupAddress.phone}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#7A655A] font-semibold">Address</p>
                      <p className="mt-1 text-[#1E1A17] leading-relaxed">
                        {pickupAddress.addressLine1}
                        {pickupAddress.addressLine2 ? `, ${pickupAddress.addressLine2}` : ''}
                        <br />
                        {pickupAddress.city}, {pickupAddress.state} — {pickupAddress.pincode}
                        <br />
                        {pickupAddress.country || 'India'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    className="secondary-button inline-flex items-center gap-2"
                    onClick={() => {
                      setAddressForm(pickupAddress)
                      setAddressErrors({})
                      setIsEditingAddress(true)
                    }}
                  >
                    <Edit2 className="h-4 w-4" /> Edit Pickup Address
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isEditingAddress && !pickupAddress && (
              <div className="mt-6 rounded-xl border border-dashed border-[#D4C4B0] bg-[#FCF8F3] p-8 text-center">
                <Truck className="h-10 w-10 text-[#8B5E34] mx-auto mb-3 opacity-80" />
                <h3 className="text-base font-semibold text-[#1E1A17]">No Pickup Address Configured</h3>
                <p className="text-sm text-[#5D4A3C] max-w-md mx-auto mt-1 mb-5">
                  Before you can mark orders as <strong>Ready to Ship</strong>, you must register your warehouse or workshop address so delivery carriers know where to pick up your packages.
                </p>
                <button
                  type="button"
                  className="primary-button inline-flex items-center gap-2 mx-auto"
                  onClick={() => {
                    setAddressErrors({})
                    setIsEditingAddress(true)
                  }}
                >
                  <Plus className="h-4 w-4" /> Add Pickup Address
                </button>
              </div>
            )}

            {/* Edit / Add Form */}
            {isEditingAddress && (
              <form className="settings-form mt-4" onSubmit={savePickupAddress}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span>Pickup Location Name / Warehouse Name *</span>
                    <input
                      required
                      placeholder="e.g. Kolkata Artisan Hub or Primary"
                      value={addressForm.pickupLocationName}
                      onChange={(e) => setAddressForm({ ...addressForm, pickupLocationName: e.target.value })}
                    />
                    <small className="text-[11px] text-[#7A655A] mt-0.5">
                      Nickname used by delivery partners (e.g. Shiprocket) to identify this pickup facility.
                    </small>
                    {addressErrors.pickupLocationName && (
                      <span className="text-xs text-red-600 mt-1">{addressErrors.pickupLocationName}</span>
                    )}
                  </label>

                  <label>
                    <span>Contact Person Name *</span>
                    <input
                      required
                      placeholder="Contact person for courier driver"
                      value={addressForm.contactPerson}
                      onChange={(e) => setAddressForm({ ...addressForm, contactPerson: e.target.value })}
                    />
                    {addressErrors.contactPerson && (
                      <span className="text-xs text-red-600 mt-1">{addressErrors.contactPerson}</span>
                    )}
                  </label>

                  <label>
                    <span>Phone Number (10 digits) *</span>
                    <input
                      required
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit Indian mobile number"
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    />
                    {addressErrors.phone && (
                      <span className="text-xs text-red-600 mt-1">{addressErrors.phone}</span>
                    )}
                  </label>

                  <label className="sm:col-span-2">
                    <span>Address Line 1 (Street, Building, Flat) *</span>
                    <input
                      required
                      placeholder="e.g. 12 Craft Guild Lane, Studio 4B"
                      value={addressForm.addressLine1}
                      onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                    />
                    {addressErrors.addressLine1 && (
                      <span className="text-xs text-red-600 mt-1">{addressErrors.addressLine1}</span>
                    )}
                  </label>

                  <label className="sm:col-span-2">
                    <span>Address Line 2 (Landmark, Area - Optional)</span>
                    <input
                      placeholder="Near Artisan Market / Landmark"
                      value={addressForm.addressLine2 || ''}
                      onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                    />
                  </label>

                  <label>
                    <span>City *</span>
                    <input
                      required
                      placeholder="City (e.g. Kolkata)"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    />
                    {addressErrors.city && (
                      <span className="text-xs text-red-600 mt-1">{addressErrors.city}</span>
                    )}
                  </label>

                  <label>
                    <span>State *</span>
                    <input
                      required
                      placeholder="State (e.g. West Bengal)"
                      value={addressForm.state}
                      onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    />
                    {addressErrors.state && (
                      <span className="text-xs text-red-600 mt-1">{addressErrors.state}</span>
                    )}
                  </label>

                  <label>
                    <span>Pincode (6 digits) *</span>
                    <input
                      required
                      maxLength={6}
                      placeholder="e.g. 700001"
                      value={addressForm.pincode}
                      onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    />
                    {addressErrors.pincode && (
                      <span className="text-xs text-red-600 mt-1">{addressErrors.pincode}</span>
                    )}
                  </label>

                  <label>
                    <span>Country</span>
                    <input
                      readOnly
                      value={addressForm.country || 'India'}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-[#E6D8C4] mt-4">
                  <button className="primary-button" type="submit" disabled={savingAddress}>
                    <Save className="h-4 w-4" /> {savingAddress ? 'Saving address…' : 'Save pickup address'}
                  </button>
                  {pickupAddress && (
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={savingAddress}
                      onClick={() => {
                        setAddressForm(pickupAddress)
                        setAddressErrors({})
                        setIsEditingAddress(false)
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {/* Tab 3: Security */}
      {activeTab === 'security' && (
        <div className="settings-grid">
          <section className="panel profile-card">
            <div className="panel-heading">
              <div>
                <h2>Security</h2>
                <p>Change your password using your current credentials.</p>
              </div>
              <LockKeyhole className="heading-icon" />
            </div>
            <form className="settings-form" onSubmit={changePassword}>
              <label>
                <span>Current password</span>
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={password.currentPassword}
                  onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })}
                />
              </label>
              <label>
                <span>New password</span>
                <input
                  required
                  minLength={8}
                  type="password"
                  autoComplete="new-password"
                  value={password.newPassword}
                  onChange={(event) => setPassword({ ...password, newPassword: event.target.value })}
                />
              </label>
              <label>
                <span>Confirm new password</span>
                <input
                  required
                  minLength={8}
                  type="password"
                  autoComplete="new-password"
                  value={password.confirmPassword}
                  onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })}
                />
              </label>
              <button className="secondary-button" disabled={saving}>
                <LockKeyhole /> Change password
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
