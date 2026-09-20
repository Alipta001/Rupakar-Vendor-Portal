'use client'

import { Activity, ArrowUpRight, Box, ChevronRight, IndianRupee, Plus, ReceiptIndianRupee, ShieldCheck, ShoppingBag, Truck, Wallet } from 'lucide-react'
import { MetricCard } from '@/components/ui/MetricCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { dashboardData } from '@/features/dashboard/services/dashboard-data'
import type { View } from '@/features/seller/types/view.types'

export function DashboardPage({ setView }: { setView: (view: View) => void }) {
  return <>
    <PageHeader eyebrow="Saturday, 20 September 2026" title={<>Good morning, Ananya <span>✦</span></>} description="Here's what's happening with Atelier Bengal today." action={<button className="primary-button" onClick={() => setView('product-new')}><Plus /> Add new product</button>} />
    <div className="verification-banner"><div className="banner-icon"><ShieldCheck /></div><div><b>Your seller profile is verified</b><p>Your store is live and ready to grow. Keep your catalog fresh to reach more customers.</p></div><button onClick={() => setView('verification')}>View verification <ChevronRight /></button></div>
    <div className="metrics-grid">
      <MetricCard label="Total sales" value="₹2,84,680" change="18.4%" icon={IndianRupee} />
      <MetricCard label="Net earnings" value="₹2,36,784" change="14.2%" icon={Wallet} accent="green" />
      <MetricCard label="Active orders" value="38" change="8.1%" icon={ShoppingBag} accent="blue" />
      <MetricCard label="Available payout" value="₹48,320" change="6.8%" icon={ReceiptIndianRupee} accent="purple" />
    </div>
    <div className="main-grid">
      <section className="panel sales-panel"><div className="panel-heading"><div><h2>Sales overview</h2><p>Revenue performance across your store</p></div><div className="segmented"><button>7D</button><button className="selected">30D</button><button>90D</button><button>1Y</button></div></div><div className="chart-wrap"><div className="chart-y"><span>₹60k</span><span>₹40k</span><span>₹20k</span><span>₹0</span></div><div className="chart"><div className="gridline one"/><div className="gridline two"/><div className="gridline three"/><svg viewBox="0 0 680 190" preserveAspectRatio="none" aria-label="Revenue trend"><defs><linearGradient id="dashboard-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#d76437" stopOpacity=".23"/><stop offset="1" stopColor="#d76437" stopOpacity="0"/></linearGradient></defs><path d="M0,155 C40,145 62,154 95,130 S143,125 170,140 S210,92 250,106 S295,62 335,92 S375,83 410,98 S452,50 490,65 S530,36 560,55 S605,18 680,34 L680,190 L0,190Z" fill="url(#dashboard-fill)"/><path d="M0,155 C40,145 62,154 95,130 S143,125 170,140 S210,92 250,106 S295,62 335,92 S375,83 410,98 S452,50 490,65 S530,36 560,55 S605,18 680,34" fill="none" stroke="#c4512b" strokeWidth="3" strokeLinecap="round"/></svg><div className="chart-x"><span>Aug 22</span><span>Aug 29</span><span>Sep 05</span><span>Sep 12</span><span>Sep 20</span></div></div></div><div className="chart-footer"><span><i className="dot orange-dot"/>Revenue <b>₹2,84,680</b></span><span><i className="dot green-dot"/>Orders <b>{dashboardData.recentOrders.length}</b></span><span className="chart-growth"><ArrowUpRight />18.4% from last month</span></div></section>
      <section className="panel quick-panel"><div className="panel-heading"><div><h2>Quick actions</h2><p>Keep your store moving</p></div><Activity className="heading-icon" /></div><div className="quick-list">{[['Add a product','List something new','product-new',Plus,'orange'],['Update inventory','3 items need attention','inventory',Box,'blue'],['Fulfil orders','8 orders awaiting action','orders',Truck,'green'],['Request payout','₹48,320 available','finance',IndianRupee,'purple']].map((row) => { const [label, sub, key, Icon, tone] = row as [string, string, string, React.ComponentType, string]; return <button key={key} onClick={() => setView(key as View)}><span className={`quick-icon ${tone}`}><Icon /></span><span><b>{label}</b><small>{sub}</small></span><ChevronRight /></button> })}</div></section>
    </div>
  </>
}
