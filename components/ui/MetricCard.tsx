import type { ComponentType } from 'react'
import { ArrowUpRight } from 'lucide-react'

export function MetricCard({ label, value, change, icon: Icon, accent = 'orange' }: { label: string; value: string; change: string; icon: ComponentType; accent?: string }) {
  return <div className="metric-card"><div className="metric-top"><span className={`metric-icon ${accent}`}><Icon /></span><span className="trend up"><ArrowUpRight />{change}</span></div><p>{label}</p><strong>{value}</strong><small>vs. last month</small></div>
}
