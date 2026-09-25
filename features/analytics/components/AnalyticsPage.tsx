'use client'

import { useEffect, useRef, useState } from 'react'
import {

  BarChart3,
  CheckCircle2,
  Clock,
  IndianRupee,
  Package,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/ui/MetricCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  analyticsService,
  type AnalyticsData,
  type AnalyticsRange,
} from '@/features/analytics/services/analytics-service'
import { statusLabel, statusTone } from '@/features/seller/types/seller.types'
import { MetricCardsSkeleton, TableSkeleton, Skeleton, ErrorState } from '@/components/skeletons'

const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const ranges: Array<{ label: string; value: AnalyticsRange }> = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: '1Y', value: '1y' },
]

export function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('30d')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [fetchKey, setFetchKey] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)
    setError('')

    analyticsService
      .get(range, { signal: controller.signal })
      .then((res) => {
        setData(res)
      })
      .catch((cause) => {
        if (cause?.name === 'CanceledError' || cause?.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Unable to load analytics data')
      })
      .finally(() => {
        setLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [range, fetchKey])


  const trend = data?.salesTrend || []
  const maxRevenue = Math.max(1, ...trend.map((p) => p.revenue || 0))
  const svgWidth = 720
  const svgHeight = 220
  const chartPaddingTop = 20
  const chartPaddingBottom = 30
  const plotHeight = svgHeight - chartPaddingTop - chartPaddingBottom

  const getCoordinates = (index: number, val: number) => {
    const totalPoints = trend.length
    const x =
      totalPoints <= 1
        ? svgWidth / 2
        : (index / (totalPoints - 1)) * (svgWidth - 40) + 20
    const ratio = Math.min(Math.max(val / maxRevenue, 0), 1)
    const y = svgHeight - chartPaddingBottom - ratio * plotHeight
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) }
  }

  const linePath =
    trend.length === 0
      ? ''
      : trend.length === 1
      ? `M 20,${getCoordinates(0, trend[0].revenue).y} L ${svgWidth - 20},${getCoordinates(0, trend[0].revenue).y}`
      : trend
          .map((p, i) => {
            const { x, y } = getCoordinates(i, p.revenue)
            return `${i === 0 ? 'M' : 'L'} ${x},${y}`
          })
          .join(' ')

  const areaPath =
    trend.length > 1
      ? `${linePath} L ${getCoordinates(trend.length - 1, 0).x},${svgHeight - chartPaddingBottom} L ${getCoordinates(0, 0).x},${svgHeight - chartPaddingBottom} Z`
      : ''

  const summary = data?.summary || {
    revenue: 0,
    orders: 0,
    unitsSold: 0,
    averageOrderValue: 0,
    customerCount: 0,
  }

  return (
    <main className="workspace space-y-6">
      <PageHeader
        eyebrow="Intelligence"
        title="Seller Analytics"
        description="Comprehensive real-time sales performance, trends, and store metrics."
        action={
          <div className="segmented">
            {ranges.map((r) => (
              <button
                key={r.value}
                className={range === r.value ? 'selected' : ''}
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {loading && data && (
        <div className="text-xs text-[var(--seller-text-muted)] animate-pulse">
          Refreshing analytics for {range.toUpperCase()}…
        </div>
      )}

      {error && data && (
        <div className="auth-notice error" role="alert">
          <span>{error}</span>
          <button className="tiny-button" onClick={() => setFetchKey((k) => k + 1)}>
            Retry
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading analytics">
          <MetricCardsSkeleton count={5} />
          <section className="panel" style={{ padding: '1.5rem' }}>
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-[220px] w-full rounded" />
          </section>
          <div className="main-grid">
            <section className="panel" style={{ padding: '1.5rem' }}>
              <TableSkeleton rows={4} cols={3} />
            </section>
            <section className="panel" style={{ padding: '1.5rem' }}>
              <TableSkeleton rows={4} cols={3} />
            </section>
          </div>
        </div>
      ) : error && !data ? (
        <ErrorState
          error={error}
          onRetry={() => {
            setError('')
            setFetchKey((k) => k + 1)
          }}
        />
      ) : (

        <>
          <div className="metrics-grid">
            <MetricCard
              label="Gross Revenue"
              value={money(summary.revenue)}
              change={`${range.toUpperCase()} period`}
              icon={IndianRupee}
            />
            <MetricCard
              label="Orders"
              value={String(summary.orders)}
              change={summary.orders === 1 ? '1 order' : `${summary.orders} orders`}
              icon={ShoppingBag}
              accent="blue"
            />
            <MetricCard
              label="Units Sold"
              value={String(summary.unitsSold)}
              change="Total items ordered"
              icon={Package}
              accent="green"
            />
            <MetricCard
              label="Avg Order Value"
              value={money(summary.averageOrderValue)}
              change="Per vendor order"
              icon={TrendingUp}
              accent="purple"
            />
            <MetricCard
              label="Unique Customers"
              value={String(summary.customerCount)}
              change="Distinct buyers"
              icon={Users}
            />
          </div>

          <section className="panel sales-panel">
            <div className="panel-heading">
              <div>
                <h2>Revenue & Sales Trend</h2>
                <p>
                  Zero-filled daily sales performance for the selected {range.toUpperCase()} period
                </p>
              </div>
              {hoverIndex !== null && trend[hoverIndex] && (
                <div className="text-right">
                  <span className="text-xs uppercase tracking-wider text-[#7A655A]">
                    {trend[hoverIndex].label}
                  </span>
                  <p className="text-base font-semibold text-[#1E1A17]">
                    {money(trend[hoverIndex].revenue)} · {trend[hoverIndex].orders} order{trend[hoverIndex].orders === 1 ? '' : 's'}
                  </p>
                </div>
              )}
            </div>

            <div className="chart-wrap">
              <div className="chart-y">
                <span>{money(maxRevenue)}</span>
                <span>{money(Math.round(maxRevenue * 0.66))}</span>
                <span>{money(Math.round(maxRevenue * 0.33))}</span>
                <span>₹0</span>
              </div>
              <div className="chart">
                <div className="gridline one" />
                <div className="gridline two" />
                <div className="gridline three" />
                {trend.length === 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: '#6b7280',
                    }}
                  >
                    No sales data available for this range
                  </div>
                ) : (
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    preserveAspectRatio="none"
                    aria-label="Sales revenue trend"
                    className="w-full h-full"
                  >
                    <defs>
                      <linearGradient id="analytics-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d76437" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#d76437" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {areaPath && <path d={areaPath} fill="url(#analytics-fill)" />}

                    {linePath && (
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#c4512b"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {trend.map((point, idx) => {
                      const { x, y } = getCoordinates(idx, point.revenue)
                      const isHovered = hoverIndex === idx
                      return (
                        <g key={point.date}>
                          <circle
                            cx={x}
                            cy={y}
                            r={isHovered ? 6 : 3}
                            fill={isHovered ? '#c4512b' : '#ffffff'}
                            stroke="#c4512b"
                            strokeWidth={isHovered ? 3 : 2}
                            style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                            onMouseEnter={() => setHoverIndex(idx)}
                            onMouseLeave={() => setHoverIndex(null)}
                          />
                        </g>
                      )
                    })}
                  </svg>
                )}
                <div className="chart-x">
                  {trend.length <= 10
                    ? trend.map((point) => <span key={point.date}>{point.label}</span>)
                    : trend
                        .filter((_, i) => i === 0 || i === Math.floor(trend.length / 2) || i === trend.length - 1 || i % Math.ceil(trend.length / 6) === 0)
                        .map((point) => <span key={point.date}>{point.label}</span>)}
                </div>
              </div>
            </div>

            <div className="chart-footer">
              <span>
                <i className="dot orange-dot" />
                Period Revenue: <b>{money(summary.revenue)}</b>
              </span>
              <span>
                <i className="dot green-dot" />
                Total Orders: <b>{summary.orders}</b>
              </span>
              <span>
                <i className="dot blue-dot" />
                Units Sold: <b>{summary.unitsSold}</b>
              </span>
            </div>
          </section>

          <div className="main-grid">
            <section className="panel table-panel">
              <div className="panel-heading">
                <div>
                  <h2>Order Status Breakdown</h2>
                  <p>Distribution across fulfillment stages</p>
                </div>
              </div>
              {data?.statusBreakdown && data.statusBreakdown.length > 0 ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Orders</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.statusBreakdown.map((row) => (
                        <tr key={row.status}>
                          <td>
                            <StatusBadge tone={statusTone(row.status)}>
                              {statusLabel(row.status)}
                            </StatusBadge>
                          </td>
                          <td>
                            <b>{row.count}</b>
                          </td>
                          <td>{money(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="auth-notice">No orders in this time period.</div>
              )}
            </section>

            <section className="panel table-panel">
              <div className="panel-heading">
                <div>
                  <h2>Top Products</h2>
                  <p>Best sellers by volume and revenue</p>
                </div>
              </div>
              {data?.topProducts && data.topProducts.length > 0 ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Units</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((p) => (
                        <tr key={`${p.productId}-${p.sku || p.productName}`}>
                          <td>
                            <b>{p.productName}</b>
                            {p.sku && <small>{p.sku}</small>}
                          </td>
                          <td>
                            <b>{p.unitsSold}</b>
                          </td>
                          <td>{money(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="auth-notice">No product sales in this period.</div>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  )
}
