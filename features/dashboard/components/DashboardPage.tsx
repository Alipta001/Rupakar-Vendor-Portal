'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowUpRight, Box, ChevronRight, IndianRupee, Plus, ReceiptIndianRupee, ShieldCheck, ShoppingBag, Truck, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { MetricCard } from '@/components/ui/MetricCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { dashboardService, type DashboardData } from '@/features/dashboard/services/dashboard-data'
import type { View } from '@/features/seller/types/view.types'
import { useAuth } from '@/providers/auth-provider'

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0)

export function DashboardPage({ setView }: { setView?: (view: View) => void }) {
  const router = useRouter()
  const { user, vendor } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    dashboardService.get().then((response) => {
      if (!active) return
      setData(response)
    }).catch((cause) => {
      if (!active) return
      setError(cause instanceof Error ? cause.message : 'Unable to load dashboard data')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  const businessName = vendor?.businessName || data?.vendor.businessName || 'Your store'
  const customerName = user?.fullName || user?.name || 'Seller'
  const quickActions = useMemo(() => [
    { label: 'Add a product', sub: 'List something new', href: '/products/new', icon: Plus, tone: 'orange' },
    { label: 'Update inventory', sub: data?.metrics.lowStockCount ? `${data.metrics.lowStockCount} items need attention` : 'Inventory is healthy', href: '/inventory', icon: Box, tone: 'blue' },
    { label: 'Fulfil orders', sub: data?.metrics.activeOrders ? `${data.metrics.activeOrders} orders awaiting action` : 'No active orders', href: '/orders', icon: Truck, tone: 'green' },
    { label: 'Check settlement readiness', sub: data?.finance.readiness.reason || 'Settlement rules applied', href: '/finance', icon: IndianRupee, tone: 'purple' },
  ], [data])

  const goTo = (href: string, view?: View) => {
    if (view && setView) setView(view)
    router.push(href)
  }

  const chartData = data?.salesTrend && data.salesTrend.length > 0 ? data.salesTrend : []
  const chartMax = Math.max(1, ...chartData.map((entry) => entry.revenue))

  return <>
    <PageHeader eyebrow={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} title={<>{`Good morning, ${customerName.split(' ')[0] || 'Seller'}`} <span>✦</span></>} description={`Here's what's happening with ${businessName} today.`} action={<button className="primary-button" onClick={() => goTo('/products/new', 'product-new')}><Plus /> Add new product</button>} />
    {data?.vendor && <div className="verification-banner"><div className="banner-icon"><ShieldCheck /></div><div><b>{data.finance.readiness.eligible ? 'Your seller profile is verified' : 'Settlement review is in progress'}</b><p>{data.finance.readiness.reason || 'Your store is live and ready to grow. Keep your catalog fresh to reach more customers.'}</p></div><button onClick={() => goTo('/verification', 'verification')}>View verification <ChevronRight /></button></div>}
    {loading && <div className="auth-notice" aria-live="polite">Loading dashboard…</div>}
    {error && <div className="auth-notice error" role="alert">{error}<button className="secondary-button" onClick={() => window.location.reload()}>Retry</button></div>}
    {!loading && data && <>
      <div className="metrics-grid">
        <MetricCard label="Total sales" value={money(data.metrics.totalSales)} change={data.salesTrend.length ? `${data.salesTrend[data.salesTrend.length - 1]?.orders ?? 0} orders` : 'No sales yet'} icon={IndianRupee} />
        <MetricCard label="Net earnings" value={money(data.metrics.netEarnings)} change={data.finance.readiness.eligible ? 'Settlement eligible' : 'Review required'} icon={Wallet} accent="green" />
        <MetricCard label="Active orders" value={String(data.metrics.activeOrders)} change={data.metrics.activeOrders ? 'Across current orders' : 'No active orders'} icon={ShoppingBag} accent="blue" />
        <MetricCard label="Settlement readiness" value={data.metrics.settlementLabel} change={data.finance.readiness.reason || 'Transfers ready on approval'} icon={ReceiptIndianRupee} accent="purple" />
      </div>
      <div className="main-grid">
        <section className="panel sales-panel"><div className="panel-heading"><div><h2>Sales overview</h2><p>Revenue performance across your store</p></div><div className="segmented"><button>7D</button><button className="selected">30D</button><button>90D</button><button>1Y</button></div></div>
          <div className="chart-wrap"><div className="chart-y"><span>₹{Math.round(chartMax / 3 / 1000)}k</span><span>₹{Math.round(chartMax / 2 / 1000)}k</span><span>₹{Math.round(chartMax / 1000)}k</span><span>₹0</span></div><div className="chart"><div className="gridline one"/><div className="gridline two"/><div className="gridline three"/>{chartData.length ? <svg viewBox="0 0 680 190" preserveAspectRatio="none" aria-label="Revenue trend"><defs><linearGradient id="dashboard-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#d76437" stopOpacity=".23"/><stop offset="1" stopColor="#d76437" stopOpacity="0"/></linearGradient></defs><path d={chartData.map((point, index) => `${index === 0 ? 'M' : 'L'} ${((index / Math.max(chartData.length - 1, 1)) * 680)},${190 - ((point.revenue / chartMax) * 150)}` ).join(' ') + ` L680,190 L0,190Z`} fill="url(#dashboard-fill)"/><path d={chartData.map((point, index) => `${index === 0 ? 'M' : 'L'} ${((index / Math.max(chartData.length - 1, 1)) * 680)},${190 - ((point.revenue / chartMax) * 150)}` ).join(' ')} fill="none" stroke="#c4512b" strokeWidth="3" strokeLinecap="round"/></svg> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280' }}>No sales data available yet</div>}<div className="chart-x">{chartData.length ? chartData.map((point) => <span key={point.date}>{point.label}</span>) : <span>No data</span>}</div></div></div><div className="chart-footer"><span><i className="dot orange-dot"/>Revenue <b>{money(data.metrics.totalSales)}</b></span><span><i className="dot green-dot"/>Orders <b>{data.recentOrders.length}</b></span><span className="chart-growth"><ArrowUpRight />{chartData.length > 1 ? `${Math.round(((chartData[chartData.length - 1].revenue - chartData[0].revenue) / Math.max(chartData[0].revenue, 1)) * 100)}% from first point` : 'Tracking current period'}</span></div></section>
        <section className="panel quick-panel"><div className="panel-heading"><div><h2>Quick actions</h2><p>Keep your store moving</p></div><Activity className="heading-icon" /></div><div className="quick-list">{quickActions.map((row) => { const Icon = row.icon; return <button key={row.href} onClick={() => goTo(row.href)}><span className={`quick-icon ${row.tone}`}><Icon /></span><span><b>{row.label}</b><small>{row.sub}</small></span><ChevronRight /></button> })}</div></section>
      </div>
      <div className="main-grid">
        <section className="panel table-panel"><div className="panel-heading"><div><h2>Recent vendor orders</h2><p>Latest sales activity</p></div></div>{data.recentOrders.length ? <div className="table-scroll"><table><thead><tr><th>Order</th><th>Items</th><th>Status</th><th>Total</th></tr></thead><tbody>{data.recentOrders.map((order) => <tr key={order._id}><td><b>#{order._id.slice(-6)}</b><small>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : 'Date unavailable'}</small></td><td>{order.itemNames.length ? order.itemNames.join(', ') : `${order.itemCount} item${order.itemCount === 1 ? '' : 's'}`}</td><td>{order.status}</td><td>{money(order.total)}</td></tr>)}</tbody></table></div> : <div className="auth-notice">No recent vendor orders yet.</div>}</section>
        <section className="panel table-panel"><div className="panel-heading"><div><h2>Low stock</h2><p>Inventory attention required</p></div></div>{data.lowStockItems.length ? <div className="table-scroll"><table><thead><tr><th>Product</th><th>Available</th><th>Threshold</th></tr></thead><tbody>{data.lowStockItems.map((item) => <tr key={item._id}><td>{item.productName}</td><td>{item.availableQuantity}</td><td>{item.lowStockThreshold}</td></tr>)}</tbody></table></div> : <div className="auth-notice">No low stock items.</div>}</section>
      </div>
    </>}
  </>
}
