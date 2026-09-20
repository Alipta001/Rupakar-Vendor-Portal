 'use client'

import { useState, type ReactNode } from 'react'
import { Bell, ChevronDown, ChevronRight, CircleHelp, Menu, MoreHorizontal, Search, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { managementNavigation, workspaceNavigation } from '@/config/navigation'

const titles: Record<string, string> = { '/dashboard': 'Overview', '/products': 'Products', '/inventory': 'Inventory', '/orders': 'Orders', '/finance': 'Finance', '/reviews': 'Reviews', '/analytics': 'Analytics', '/store': 'My Store', '/verification': 'Verification', '/notifications': 'Notifications', '/support': 'Support', '/settings': 'Settings', '/profile': 'Profile' }

export function SellerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const title = titles[pathname] || (pathname.startsWith('/products/') ? 'Product detail' : pathname.startsWith('/orders/') ? 'Order detail' : 'Seller Studio')
  const navigate = (href: string) => { setOpen(false); router.push(href) }
      return (
        <div className="app-shell theme-white">
          <aside className={`sidebar ${open ? 'open' : ''}`}>
            <div className="brand">
              <div className="brand-mark">R</div>
              <div>
                <b>RUPAKAR</b>
                <span>SELLER STUDIO</span>
              </div>
              <button className="sidebar-close" onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>
            <div className="store-switch">
              <div className="store-avatar">AB</div>
              <div>
                <b>Atelier Bengal</b>
                <span>Verified seller</span>
              </div>
              <ChevronDown />
            </div>
            <nav>
              <div className="nav-label">Workspace</div>
              {workspaceNavigation.map((item) => (
                <button
                  key={item.href}
                  className={pathname === item.href ? 'active' : ''}
                  onClick={() => navigate(item.href)}
                >
                  <item.icon />
                  <span>{item.label}</span>
                  {item.count && <em>{item.count}</em>}
                </button>
              ))}
              <div className="nav-label manage-label">Manage</div>
              {managementNavigation.map((item) => (
                <button
                  key={item.href}
                  className={pathname === item.href ? 'active' : ''}
                  onClick={() => navigate(item.href)}
                >
                  <item.icon />
                  <span>{item.label}</span>
                  {item.count && <em className="alert-count">{item.count}</em>}
                </button>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <div className="help-card">
                <CircleHelp />
                <div>
                  <b>Need a hand?</b>
                  <span>Visit Seller Support</span>
                </div>
                <ChevronRight />
              </div>
              <div className="user-row">
                <div className="user-avatar">AS</div>
                <div>
                  <b>Ananya Sen</b>
                  <span>Owner · VENDOR</span>
                </div>
                <MoreHorizontal />
              </div>
            </div>
          </aside>
          {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
          <div className="app-content">
            <header className="topbar">
              <button className="mobile-menu" onClick={() => setOpen(true)}>
                <Menu />
              </button>
              <div className="breadcrumbs">
                <span>Seller Studio</span>
                <ChevronRight />
                <b>{title}</b>
              </div>
              <div className="header-actions">
                <button className="icon-button">
                  <Search />
                </button>
                <button className="icon-button notification" onClick={() => navigate('/notifications')}>
                  <Bell />
                  <i />
                </button>
                <button className="header-user" onClick={() => navigate('/settings')}>
                  <div className="user-avatar">AS</div>
                  <div>
                    <b>Ananya Sen</b>
                    <span>Atelier Bengal</span>
                  </div>
                  <ChevronDown />
                </button>
              </div>
            </header>
            <main className="workspace">{children}</main>
            <footer className="app-footer">
              <span>© 2026 RUPAKAR Seller Studio</span>
              <span>
                <span className="live-dot" />
                All systems operational <span className="footer-sep">·</span>
                <button className="footer-link" onClick={() => navigate('/support')}>
                  Seller support
                </button>
              </span>
            </footer>
          </div>
        </div>
      )
}
