import React from 'react'

export interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
  children?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className = '',
  children,
}: EmptyStateProps) {
  return (
    <div className={`empty-state ${className}`} role="status">
      <h2>{title}</h2>
      {description && <p className="subtle">{description}</p>}
      {children}
      {actionLabel && onAction && (
        <button className="primary-button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
