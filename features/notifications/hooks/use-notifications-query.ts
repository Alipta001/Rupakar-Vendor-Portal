'use client'

import { useQuery } from '@tanstack/react-query'
import { notificationService } from '@/features/notifications/services/notification-service'

export function useNotificationsQuery(page = 1, limit = 20, unreadOnly = false) {
  return useQuery({ queryKey: ['notifications', page, limit, unreadOnly], queryFn: () => notificationService.list(page, limit, unreadOnly) })
}
