export type ProductStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'REJECTED'
export type OrderStatus = 'NEW' | 'ACCEPTED' | 'PROCESSING' | 'READY_TO_SHIP' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
export type VerificationStatus = 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'ACTION_REQUIRED'
export type ShipmentStatus = 'NOT_CREATED' | 'READY_TO_SHIP' | 'SHIPPED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'RETURNED'
export interface SellerProfile { id: string; storeName: string; ownerName: string; email: string; mobile: string; role: string; verified: boolean; status: 'ACTIVE' | 'PAUSED' | 'SUSPENDED'; lastLogin: string }
export interface Product { id: string; name: string; category: string; sku: string; price: number; mrp: number; stock: number; status: ProductStatus; rating: number; sales: number; updatedAt: string }
export interface Order { id: string; customer: string; item: string; sku: string; variant: string; quantity: number; amount: number; paymentStatus: string; status: OrderStatus; date: string; tracking?: string }
export interface InventoryItem { product: string; variant: string; sku: string; available: number; reserved: number; threshold: number; location: string }
export interface Notification { id: string; title: string; body: string; type: string; time: string; unread: boolean }
export interface ServiceResult<T> { data: T; error?: string }
export interface ProductDraft { name: string; shortDescription: string; description: string; category: string; subcategory: string; brand: string; tags: string; sku: string; price: string; mrp: string; stock: string; tax: string; weight: string; dispatchTime: string; originState: string; artisan: string; slug: string; metaTitle: string; metaDescription: string }
export const emptyProductDraft: ProductDraft = { name:'', shortDescription:'', description:'', category:'Handicrafts', subcategory:'', brand:'', tags:'', sku:'', price:'', mrp:'', stock:'', tax:'5', weight:'', dispatchTime:'2–3 days', originState:'West Bengal', artisan:'', slug:'', metaTitle:'', metaDescription:'' }
export const orderTransitions: Record<OrderStatus, OrderStatus[]> = { NEW:['ACCEPTED','CANCELLED'], ACCEPTED:['PROCESSING'], PROCESSING:['READY_TO_SHIP'], READY_TO_SHIP:['SHIPPED'], SHIPPED:['OUT_FOR_DELIVERY'], OUT_FOR_DELIVERY:['DELIVERED'], DELIVERED:[], CANCELLED:[] }
export const formatINR = (value:number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value)
export const statusLabel = (status:string) => status.replaceAll('_',' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
export const statusTone = (status:string) => ['APPROVED','PUBLISHED','DELIVERED','VERIFIED','ACTIVE','PAID'].includes(status) ? 'success' : ['REJECTED','CANCELLED','SUSPENDED','FAILED'].includes(status) ? 'danger' : ['UNDER_REVIEW','SUBMITTED','PROCESSING','READY_TO_SHIP','OUT_FOR_DELIVERY','ACTION_REQUIRED','LOW_STOCK','PENDING'].includes(status) ? 'warning' : 'neutral'
