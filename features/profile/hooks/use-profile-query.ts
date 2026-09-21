'use client'

import { useQuery } from '@tanstack/react-query'
import { profileService } from '@/features/profile/services/profile-service'

export function useProfileQuery() {
  return useQuery({ queryKey: ['profile'], queryFn: async () => ({ user: await profileService.getCurrentUser(), vendor: await profileService.getCurrentVendor() }) })
}
