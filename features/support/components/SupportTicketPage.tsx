'use client'

import { FormEvent, useState } from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAddSupportMessageMutation, useSupportTicketQuery } from '@/features/support/hooks/use-support-query'

export function SupportTicketPage({ ticketId }: { ticketId: string }) {
  const router = useRouter()
  const ticket = useSupportTicketQuery(ticketId)
  const addMessage = useAddSupportMessageMutation(ticketId)
  const [message, setMessage] = useState('')
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!message.trim()) return; await addMessage.mutateAsync(message.trim()); setMessage('') }
  if (ticket.isPending) return <main className="workspace"><p className="subtle">Loading ticket…</p></main>
  if (ticket.error || !ticket.data) return <main className="workspace"><div className="auth-notice error">{ticket.error instanceof Error ? ticket.error.message : 'Support ticket unavailable.'}</div></main>
  const currentTicket = ticket.data
  return <main className="workspace support-ticket-page"><PageHeader eyebrow="Seller help center" title={currentTicket.subject} description={`${currentTicket.category} · Created ${new Date(currentTicket.createdAt).toLocaleDateString('en-IN')}`} action={<button className="secondary-button" onClick={() => router.push('/support')}><ArrowLeft /> Back to support</button>} /><section className="panel ticket-detail"><div className="ticket-detail-header"><div><h2>Conversation</h2><p>Replies from you and the support team appear here.</p></div><StatusBadge tone={currentTicket.status === 'OPEN' || currentTicket.status === 'IN_PROGRESS' ? 'warning' : currentTicket.status === 'RESOLVED' ? 'success' : 'neutral'}>{currentTicket.status.replaceAll('_', ' ')}</StatusBadge></div><div className="ticket-messages">{currentTicket.messages.map((item) => <article className={`ticket-message ${item.senderRole === 'vendor' ? 'seller' : 'support'}`} key={item._id}><b>{item.senderRole === 'vendor' ? 'You' : 'Support team'}</b><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString('en-IN')}</small></article>)}</div>{!['RESOLVED', 'CLOSED'].includes(currentTicket.status) && <form className="ticket-reply" onSubmit={submit}><textarea required minLength={1} maxLength={5000} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a reply…" /><button className="primary-button" disabled={addMessage.isPending}><Send />{addMessage.isPending ? 'Sending…' : 'Send reply'}</button></form>}</section></main>
}
