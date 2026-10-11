'use client'

import { use } from 'react'
import { ReturnDetailsPage } from '@/features/returns/components/ReturnDetailsPage'

export default function ReturnDetailsRoute({
  params,
}: {
  params?: Promise<{ returnId: string }> | { returnId: string }
}) {
  let resolvedReturnId: string | undefined
  if (params) {
    if (typeof (params as any)?.then === 'function') {
      try {
        const unwrapped = use(params as Promise<{ returnId: string }>)
        resolvedReturnId = unwrapped?.returnId
      } catch {
        // Fallback to useParams inside ReturnDetailsPage
      }
    } else {
      resolvedReturnId = (params as { returnId: string })?.returnId
    }
  }

  return <ReturnDetailsPage returnId={resolvedReturnId} />
}
