export function LoadingState({ label = 'Loading' }: { label?: string }) { return <div role="status" aria-live="polite">{label}</div> }
export function ErrorState({ message = 'Something went wrong.' }: { message?: string }) { return <div role="alert">{message}</div> }
export function EmptyState({ message = 'Nothing to show yet.' }: { message?: string }) { return <div role="status">{message}</div> }
