import { api } from '@/api'
import type { SellerProfileData, UserProfile, VendorProfile } from '@/features/profile/types/profile.types'

export const profileService = {
  async getCurrentUser() { return api.get<UserProfile>('/users/me') },
  async getCurrentVendor() { return api.get<VendorProfile>('/vendors/me') },
  async getSellerProfile(): Promise<SellerProfileData> {
    const [user, vendor] = await Promise.all([this.getCurrentUser(), this.getCurrentVendor()])
    return { user, vendor }
  },
  async updateUserProfile(payload: Partial<Pick<UserProfile, 'name' | 'firstName' | 'lastName' | 'email' | 'phone' | 'avatar'>>) {
    return api.patch<UserProfile>('/users/me', payload)
  },
  async updateVendorProfile(payload: Partial<Pick<VendorProfile, 'businessName' | 'legalName' | 'businessType' | 'description' | 'email' | 'phone' | 'website' | 'address'>>) {
    return api.patch<VendorProfile>('/vendors/me', payload)
  },
  async changePassword(currentPassword: string, newPassword: string) {
    return api.post<{ changed: boolean }>('/users/change-password', { currentPassword, newPassword })
  },
}
