import { api, setAccessToken } from '@/lib/api/client'
import type { SellerProfile, ServiceResult } from '@/features/seller/types/seller.types'
import type { UserProfile, VendorProfile } from '@/features/profile/types/profile.types'

export interface LoginRequest { emailOrMobile: string; password: string; rememberMe?: boolean }
export interface LoginResponse { seller: SellerProfile; token?: string; message?: string }
export interface RegisterRequest { storeName: string; ownerName: string; email: string; mobile: string; password: string; confirmPassword: string; termsAccepted: boolean }
export interface VerifyRequest { otp: string; email: string }
export interface ForgotPasswordRequest { emailOrMobile: string }
export interface ResetPasswordRequest { newPassword: string; confirmPassword: string; email: string; otp: string }
export interface SecuritySession { id: string; device: string; ip: string; lastActive: string; isCurrent: boolean }
export interface AuthState { seller?: SellerProfile; isLoading: boolean; error?: string; success?: string; step?: string }

type BackendAuth = { user: UserProfile; accessToken: string }

const emptySeller = (id = ''): SellerProfile => ({ id, storeName: '', ownerName: '', email: '', mobile: '', role: 'VENDOR', verified: false, status: 'PAUSED', lastLogin: '' })
const mapSeller = (user: UserProfile, vendor: VendorProfile): SellerProfile => ({
  id: vendor.id,
  storeName: vendor.businessName,
  ownerName: user.name,
  email: vendor.email || user.email,
  mobile: vendor.phone || user.phone,
  role: user.role,
  verified: vendor?.verificationStatus === 'VERIFIED',
  status: vendor?.status === 'SUSPENDED' || vendor?.status === 'BLOCKED' ? 'SUSPENDED' : vendor?.status === 'APPROVED' ? 'ACTIVE' : 'PAUSED',
  lastLogin: new Date().toLocaleString('en-IN'),
})

const unwrapError = (error: unknown) => error instanceof Error ? error.message : 'Request failed'

export const authService = {
  async login(request: LoginRequest): Promise<ServiceResult<LoginResponse>> {
    try {
      const result = await api.post<BackendAuth>('/auth/login', { email: request.emailOrMobile, password: request.password })
      setAccessToken(result.accessToken)
      const vendor = await api.get<VendorProfile>('/vendors/me')
      if (vendor.status === 'SUSPENDED' || vendor.status === 'BLOCKED') {
        setAccessToken(null)
        return { data: {} as LoginResponse, error: 'Your seller account is suspended.' }
      }
      return { data: { seller: mapSeller(result.user, vendor), token: result.accessToken, message: 'Login successful' } }
    } catch (error) { return { data: {} as LoginResponse, error: unwrapError(error) } }
  },

  async register(request: RegisterRequest): Promise<ServiceResult<{ sellerId: string; nextStep: string }>> {
    try {
      if (request.password !== request.confirmPassword) return { data: { sellerId: '', nextStep: '' }, error: 'Passwords do not match' }
      if (!request.termsAccepted) return { data: { sellerId: '', nextStep: '' }, error: 'You must accept the seller terms' }
      const result = await api.post<BackendAuth>('/auth/register-seller', {
        name: request.ownerName,
        email: request.email,
        password: request.password,
        storeName: request.storeName,
        mobile: request.mobile,
      })
      setAccessToken(result.accessToken)
      return { data: { sellerId: result.user.id, nextStep: 'verify' } }
    } catch (error) { return { data: { sellerId: '', nextStep: '' }, error: unwrapError(error) } }
  },

  async resendOTP(emailOrMobile: string): Promise<ServiceResult<{ expiresIn: number }>> {
    try { await api.post('/auth/forgot-password', { email: emailOrMobile }); return { data: { expiresIn: 600 } } }
    catch (error) { return { data: { expiresIn: 0 }, error: unwrapError(error) } }
  },

  async verifyOTP(request: VerifyRequest): Promise<ServiceResult<{ seller: SellerProfile }>> {
    try {
      const result = await api.post<BackendAuth>('/auth/verify-otp', request)
      setAccessToken(result.accessToken)
      const vendor = await api.get<VendorProfile>('/vendors/me')
      return { data: { seller: mapSeller(result.user, vendor) } }
    } catch (error) { return { data: { seller: emptySeller() }, error: unwrapError(error) } }
  },

  async forgotPassword(request: ForgotPasswordRequest): Promise<ServiceResult<{ resetTokenSent: boolean }>> {
    try { await api.post('/auth/forgot-password', { email: request.emailOrMobile }); return { data: { resetTokenSent: true } } }
    catch (error) { return { data: { resetTokenSent: false }, error: unwrapError(error) } }
  },

  async resetPassword(request: ResetPasswordRequest): Promise<ServiceResult<{ success: boolean }>> {
    try { await api.post('/auth/reset-password', request); return { data: { success: true } } }
    catch (error) { return { data: { success: false }, error: unwrapError(error) } }
  },

  async logout(): Promise<ServiceResult<{ success: boolean }>> { try { await api.post('/auth/logout'); setAccessToken(null); return { data: { success: true } } } catch (error) { setAccessToken(null); return { data: { success: false }, error: unwrapError(error) } } },
}
