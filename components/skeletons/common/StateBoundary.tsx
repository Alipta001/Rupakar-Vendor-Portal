import React from 'react'
import { ErrorState } from './ErrorState'
import { EmptyState } from './EmptyState'

export interface StateBoundaryProps<T> {
  isLoading: boolean
  isFetching?: boolean
  isError: boolean
  error?: unknown
  data?: T[] | null
  loadingComponent: React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
  emptyActionLabel?: string
  onEmptyAction?: () => void
  onRetry?: () => void
  children: (data: T[]) => React.ReactNode
}

export function StateBoundary<T>({
  isLoading,
  isFetching = false,
  isError,
  error,
  data,
  loadingComponent,
  emptyTitle = 'No records found',
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  onRetry,
  children,
}: StateBoundaryProps<T>) {
  const items = Array.isArray(data) ? data : []

  if ((isLoading || (isFetching && items.length === 0)) && items.length === 0) {
    return <div aria-busy="true">{loadingComponent}</div>
  }

  if (isError && items.length === 0) {
    return <ErrorState error={error} onRetry={onRetry} />
  }

  if (items.length === 0 && !isLoading && !isFetching && !isError) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    )
  }

  return <>{children(items)}</>
}
