export type UserProfile = {
  id: string
  name: string
  fullName: string
  firstName: string
  lastName: string
  email: string
  phone: string
  avatar: string
  role: string
  status: string
  isActive: boolean
  isVerified: boolean
  createdAt?: string
  updatedAt?: string
}

export type VendorPickupAddress = {
  pickupLocationName: string
  contactPerson: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  pincode: string
  country?: string
  shiprocketPickupId?: string | null
  registrationStatus?: 'PENDING' | 'REGISTERED' | 'FAILED'
  adminStatus?: 'PENDING' | 'APPROVED' | 'DEACTIVATED' | 'ARCHIVED'
  registeredAt?: string | null
  registrationError?: string | null
}

export type VendorProfile = {
  id: string
  businessName: string
  legalName?: string
  businessType?: string
  description?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  pickupAddress?: VendorPickupAddress | null
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'BLOCKED'
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
  rejectionReason?: string
  approvedAt?: string
  updatedAt?: string
}

export type SellerProfileData = { user: UserProfile; vendor: VendorProfile }
