'use client'

import { SupportTicketPage } from '@/features/support/components/SupportTicketPage'

export default function SupportTicketRoute({ params }: { params: { ticketId: string } }) {
  return <SupportTicketPage ticketId={params.ticketId} />
}
