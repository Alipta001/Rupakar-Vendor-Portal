import { TableSkeleton } from '@/components/skeletons'

export default function ProductsLoading() {
  return (
    <main className="workspace">
      <div className="panel" style={{ padding: '1.5rem' }}>
        <TableSkeleton rows={8} cols={7} />
      </div>
    </main>
  )
}
