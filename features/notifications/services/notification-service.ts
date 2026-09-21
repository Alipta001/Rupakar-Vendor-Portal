import { api } from '@/api'

export type NotificationItem = {
  _id: string
  type: string
  title: string
  message: string
  channel: string
  status: string
  readAt?: string | null
  createdAt?: string
}
export type NotificationPage = { items: NotificationItem[]; page: number; limit: number; total: number; unreadCount: number }

export const notificationService = {
  list: (page = 1, limit = 20, unreadOnly = false) => api.get<NotificationPage>(`/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`),
  unreadCount: () => api.get<{ unreadCount: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.patch<{ success: boolean }>(`/notifications/${id}/read`, {}),
  markAllRead: () => api.patch<{ markedCount: number }>('/notifications/read-all', {}),
}
