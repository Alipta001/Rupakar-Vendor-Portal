'use client'

import { useParams } from 'next/navigation'
import { SupportTicketPage } from '@/features/support/components/SupportTicketPage'

export default function SupportTicketRoute({ params }: { params?: Promise<{ ticketId: string }> | { ticketId: string } }) {
  const routeParams = useParams<{ ticketId: string }>()
  const ticketId = routeParams?.ticketId || (params as any)?.ticketId
  return <SupportTicketPage ticketId={ticketId} />
}
