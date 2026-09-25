import { MetricCardsSkeleton, TableSkeleton } from '@/components/skeletons'

export default function InventoryLoading() {
  return (
    <main className="workspace space-y-6">
      <MetricCardsSkeleton count={3} />
      <div className="panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <TableSkeleton rows={6} cols={6} />
      </div>
    </main>
  )
}
