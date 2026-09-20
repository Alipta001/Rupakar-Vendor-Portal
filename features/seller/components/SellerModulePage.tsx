'use client'

import { AlertCircle, BarChart3, ChevronRight, Download, FileCheck2, IndianRupee, LifeBuoy, Plus, Store, Users, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/ui/MetricCard'
import type { View } from '@/features/seller/types/view.types'

const modules: Partial<Record<View, [string, string, React.ComponentType<{ className?: string }>]>> = { finance: ['Finance', 'Track earnings, commissions, and payouts.', Wallet], reviews: ['Reviews', 'Build trust with every response.', FileCheck2], analytics: ['Analytics', 'Understand what is driving your store.', BarChart3], store: ['My Store', 'Shape the story customers see.', Store], support: ['Support', 'We are here when you need us.', LifeBuoy], settings: ['Settings', 'Manage account, security, store, and preferences.', Users], staff: ['Staff', 'Manage team access and permissions.', Users] }

export function SellerModulePage({ view, setView }: { view: View; setView: (view: View) => void }) {
  const data = modules[view] || ['Seller Studio', 'Manage your seller workspace.', LifeBuoy]
  const Icon = data[2]
  return <><PageHeader eyebrow="Seller Studio" title={data[0]} description={data[1]} action={<button className="secondary-button"><Download /> Export report</button>} /><div className="metrics-grid"><MetricCard label={view === 'finance' ? 'Available balance' : view === 'reviews' ? 'Average rating' : view === 'analytics' ? 'Store conversion' : view === 'store' ? 'Store profile' : 'Account status'} value={view === 'finance' ? '₹48,320' : view === 'reviews' ? '4.8' : view === 'analytics' ? '3.24%' : view === 'store' ? '92%' : 'Active'} change="12.6%" icon={Icon} /><MetricCard label="This month" value={view === 'finance' ? '₹86,420' : view === 'reviews' ? '36 new' : '₹28,460'} change="8.4%" icon={IndianRupee} accent="green" /><MetricCard label="Needs attention" value="0" change="Healthy" icon={AlertCircle} accent="purple" /></div><section className="panel placeholder-panel"><div className="empty-illustration"><Icon /></div><h2>{view === 'finance' ? 'Your finance workspace is ready' : view === 'store' ? 'Storefront management' : 'Detailed ' + data[0].toLowerCase()}</h2><p>Explore the sections above to manage {data[0].toLowerCase()}, review activity, and keep your seller operation moving.</p><div className="placeholder-lines"><i /><i /><i /></div><button className="primary-button" onClick={() => setView(view === 'store' ? 'settings' : view === 'finance' ? 'orders' : 'dashboard')}>{view === 'store' ? 'Edit store' : view === 'finance' ? 'View transactions' : 'Back to overview'} <ChevronRight /></button></section></>
}
