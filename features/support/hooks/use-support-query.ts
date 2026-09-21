'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supportService, type SupportStatus } from '@/features/support/services/support-service'

export const supportQueryKey = (status?: SupportStatus) => ['support-tickets', status] as const

export function useSupportTicketsQuery(status?: SupportStatus) {
  return useQuery({ queryKey: supportQueryKey(status), queryFn: () => supportService.list({ status }) })
}

export function useCreateSupportTicketMutation() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: supportService.create, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['support-tickets'] }) })
}

export function useSupportTicketQuery(id?: string) {
  return useQuery({ queryKey: ['support-ticket', id], queryFn: () => supportService.get(id as string), enabled: Boolean(id) })
}

export function useAddSupportMessageMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (message: string) => supportService.addMessage(id, message), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['support-ticket', id] }); void queryClient.invalidateQueries({ queryKey: ['support-tickets'] }) } })
}
