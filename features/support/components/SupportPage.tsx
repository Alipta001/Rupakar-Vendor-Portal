'use client'

import { useState } from 'react'
import { LifeBuoy, Plus, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useCreateSupportTicketMutation, useSupportTicketsQuery } from '@/features/support/hooks/use-support-query'
import type { SupportCategory } from '@/features/support/services/support-service'

const categories: Array<{ value: SupportCategory; label: string }> = [
  { value: 'PRODUCTS', label: 'Product and catalog' }, { value: 'ORDERS', label: 'Orders and shipping' }, { value: 'FINANCE', label: 'Payments and finance' }, { value: 'VERIFICATION', label: 'Verification and KYC' }, { value: 'STORE', label: 'Store and account' }, { value: 'POLICIES', label: 'Policies' }, { value: 'OTHER', label: 'Other' },
]

export function SupportPage() {
  const [form, setForm] = useState({ category: 'PRODUCTS' as SupportCategory, subject: '', message: '', orderId: '', productId: '' })
  const [notice, setNotice] = useState('')
  const tickets = useSupportTicketsQuery()
  const createTicket = useCreateSupportTicketMutation()
  const router = useRouter()
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setNotice('')
    try { await createTicket.mutateAsync({ ...form, orderId: form.orderId || undefined, productId: form.productId || undefined }); setForm((current) => ({ ...current, subject: '', message: '', orderId: '', productId: '' })); setNotice('Your ticket has been created. Our support team will review it.') } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to create support ticket') }
  }
  return <main className="workspace support-page"><PageHeader eyebrow="Seller help center" title="Support" description="Find help for your seller account or contact the support team." /><div className="support-grid"><section className="panel support-topics"><div className="support-section-heading"><div className="empty-illustration"><LifeBuoy /></div><div><h2>How can we help?</h2><p>Choose a topic or send us the details of your issue.</p></div></div><div className="support-topic-list">{categories.slice(0, 6).map((category) => <div className="support-topic" key={category.value}><b>{category.label}</b><span>Get help with {category.label.toLowerCase()}.</span></div>)}</div></section><section className="panel support-form-panel"><div className="panel-heading"><div><h2>Create support ticket</h2><p>Include references so the team can investigate quickly.</p></div></div>{notice && <div className="auth-notice" role="status">{notice}</div>}<form className="support-form" onSubmit={submit}><label><span>Category</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as SupportCategory })}>{categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></label><label><span>Subject</span><input required minLength={3} maxLength={160} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="What do you need help with?" /></label><label><span>Message</span><textarea required minLength={10} maxLength={5000} rows={5} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Describe the issue and what you have already tried." /></label><div className="support-reference-grid"><label><span>Order reference (optional)</span><input value={form.orderId} onChange={(event) => setForm({ ...form, orderId: event.target.value })} placeholder="Order ID" /></label><label><span>Product reference (optional)</span><input value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })} placeholder="Product ID" /></label></div><button className="primary-button" disabled={createTicket.isPending}><Send />{createTicket.isPending ? 'Creating ticket…' : 'Create ticket'}</button></form></section></div><section className="panel support-ticket-list"><div className="panel-heading"><div><h2>Your support tickets</h2><p>Track open conversations and previous requests.</p></div><Plus className="heading-icon" /></div>{tickets.isPending ? <p className="subtle">Loading tickets…</p> : tickets.error ? <div className="auth-notice error">{tickets.error instanceof Error ? tickets.error.message : 'Unable to load tickets'}</div> : tickets.data?.items.length ? <div className="support-tickets">{tickets.data.items.map((ticket) => <article className="support-ticket-row" key={ticket._id} onClick={() => router.push(`/support/${ticket._id}`)}><div><b>{ticket.subject}</b><small>{ticket.category} · {new Date(ticket.createdAt).toLocaleDateString('en-IN')}</small></div><StatusBadge tone={ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS' ? 'warning' : ticket.status === 'RESOLVED' ? 'success' : 'neutral'}>{ticket.status.replaceAll('_', ' ')}</StatusBadge></article>)}</div> : <div className="empty-state"><h2>No tickets yet</h2><p className="subtle">Your support conversations will appear here.</p></div>}</section></main>
}
