export type ApiEnvelope<T> = { success: boolean; data: T; message?: string; requestId?: string }
export type Paginated<T> = { items: T[]; page: number; limit: number; total: number }
export type ApiErrorShape = { status: number; code?: string; message: string }
