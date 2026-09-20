import type { ReactNode } from 'react'

export function StatusBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={`status-badge ${tone}`}>{children}</span>
}
