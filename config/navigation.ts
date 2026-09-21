import { BarChart3, Bell, Box, FileText, LayoutDashboard, LifeBuoy, Package, Settings, ShieldCheck, ShoppingBag, Store, Wallet, type LucideIcon } from 'lucide-react'

export type SellerRoute = '/dashboard' | '/products' | '/inventory' | '/orders' | '/finance' | '/reviews' | '/analytics' | '/store' | '/verification' | '/notifications' | '/support' | '/settings' | '/profile'
export type NavigationItem = { label: string; icon: LucideIcon; href: SellerRoute; count?: string }

export const workspaceNavigation: NavigationItem[] = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Products', icon: Package, href: '/products' },
  { label: 'Inventory', icon: Box, href: '/inventory' },
  { label: 'Orders', icon: ShoppingBag, href: '/orders' },
  { label: 'Finance', icon: Wallet, href: '/finance' },
  { label: 'Reviews', icon: FileText, href: '/reviews' },
  { label: 'Analytics', icon: BarChart3, href: '/analytics' },
]

export const managementNavigation: NavigationItem[] = [
  { label: 'My Store', icon: Store, href: '/store' },
  { label: 'Verification', icon: ShieldCheck, href: '/verification' },
  { label: 'Notifications', icon: Bell, href: '/notifications', count: '4' },
  { label: 'Support', icon: LifeBuoy, href: '/support' },
  { label: 'Settings', icon: Settings, href: '/settings' },
]
