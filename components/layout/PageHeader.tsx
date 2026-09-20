import type { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: ReactNode; description: string; action?: ReactNode }) {
  return <div className="welcome-row"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="subtle">{description}</p></div>{action}</div>
}
