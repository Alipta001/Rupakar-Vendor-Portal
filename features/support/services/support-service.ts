import { api, endpoints } from '@/api'

export type SupportCategory = 'PRODUCTS' | 'ORDERS' | 'FINANCE' | 'VERIFICATION' | 'STORE' | 'POLICIES' | 'OTHER'
export type SupportStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type SupportMessage = { _id: string; senderUserId: string; senderRole: string; message: string; createdAt: string }
export type SupportTicket = { _id: string; category: SupportCategory; subject: string; orderId?: string; productId?: string; status: SupportStatus; messages: SupportMessage[]; createdAt: string; updatedAt: string }
export type SupportTicketPage = { items: SupportTicket[]; page: number; limit: number; total: number }

export const supportService = {
  list: (params: { page?: number; limit?: number; status?: SupportStatus } = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => { if (value !== undefined) query.set(key, String(value)) })
    return api.get<SupportTicketPage>(`${endpoints.support.tickets}?${query.toString()}`)
  },
  get: (id: string) => api.get<SupportTicket>(`${endpoints.support.tickets}/${id}`),
  create: (payload: { category: SupportCategory; subject: string; message: string; orderId?: string; productId?: string }) => api.post<SupportTicket>(endpoints.support.tickets, payload),
  addMessage: (id: string, message: string) => api.post<SupportTicket>(`${endpoints.support.tickets}/${id}/messages`, { message }),
}
