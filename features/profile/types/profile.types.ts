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
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'BLOCKED'
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
  rejectionReason?: string
  approvedAt?: string
  updatedAt?: string
}

export type SellerProfileData = { user: UserProfile; vendor: VendorProfile }
