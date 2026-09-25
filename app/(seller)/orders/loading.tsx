import { MetricCardsSkeleton, TableSkeleton } from '@/components/skeletons'

export default function OrdersLoading() {
  return (
    <main className="workspace space-y-6">
      <MetricCardsSkeleton count={3} />
      <div className="panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <TableSkeleton rows={8} cols={7} />
      </div>
    </main>
  )
}
