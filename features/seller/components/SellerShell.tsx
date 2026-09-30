'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Bell, ChevronDown, ChevronRight, ChevronUp, CircleHelp, LogOut, Menu, Search, Settings, User, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { managementNavigation, workspaceNavigation } from '@/config/navigation'
import { api } from '@/api'
import { useAuth } from '@/providers/auth-provider'

const titles: Record<string, string> = { '/dashboard': 'Overview', '/products': 'Products', '/inventory': 'Inventory', '/orders': 'Orders', '/finance': 'Finance', '/reviews': 'Reviews', '/analytics': 'Analytics', '/store': 'My Store', '/verification': 'Verification', '/notifications': 'Notifications', '/support': 'Support', '/settings': 'Settings', '/profile': 'Profile' }

export function SellerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user, vendor } = useAuth()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState<number>()
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false)
  const [topbarMenuOpen, setTopbarMenuOpen] = useState(false)

  const sidebarUserMenuRef = useRef<HTMLDivElement>(null)
  const topbarUserMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    api.get<{ unreadCount: number }>('/notifications/unread-count')
      .then((result) => { if (active) setUnreadCount(result.unreadCount) })
      .catch(() => undefined)
    return () => { active = false }
  }, [pathname])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (sidebarUserMenuRef.current && !sidebarUserMenuRef.current.contains(target)) {
        setSidebarMenuOpen(false)
      }
      if (topbarUserMenuRef.current && !topbarUserMenuRef.current.contains(target)) {
        setTopbarMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const title = titles[pathname] || (pathname.startsWith('/products/') ? 'Product detail' : pathname.startsWith('/orders/') ? 'Order detail' : 'Seller Studio')
  const navigate = (href: string) => {
    setOpen(false)
    setSidebarMenuOpen(false)
    setTopbarMenuOpen(false)
    router.push(href)
  }
  const displayName = user?.fullName || user?.name || 'Seller'
  const storeName = vendor?.businessName || 'My Store'
  const initials = displayName.split(' ').map((w) => w[0] ?? '').slice(0, 2).join('').toUpperCase() || 'S'
  const storeInitials = storeName.split(' ').map((w) => w[0] ?? '').slice(0, 2).join('').toUpperCase() || 'S'

  return (
    <div className="app-shell theme-white">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark" style={{ overflow: 'hidden', padding: 0 }}>
            <img src="/Rupakar-logo.jpeg" alt="Rupakar logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="eager" />
          </div>
          <div>
            <b>RUPAKAR</b>
            <span>SELLER STUDIO</span>
          </div>
          <button className="sidebar-close" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <div className="store-switch">
          <div className="store-avatar">{storeInitials}</div>
          <div>
            <b>{storeName}</b>
            <span>{vendor?.verificationStatus === 'VERIFIED' ? 'Verified seller' : 'Seller account'}</span>
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
              {item.href === '/notifications' && unreadCount !== undefined ? <em className="alert-count">{unreadCount}</em> : item.count && <em className="alert-count">{item.count}</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card" onClick={() => navigate('/support')} style={{ cursor: 'pointer' }}>
            <CircleHelp />
            <div>
              <b>Need a hand?</b>
              <span>Visit Seller Support</span>
            </div>
            <ChevronRight />
          </div>
          <div className="sidebar-user-menu-wrap" ref={sidebarUserMenuRef}>
            {sidebarMenuOpen && (
              <div className="sidebar-dropup-menu" role="menu">
                <button type="button" onClick={() => navigate('/profile')}>
                  <User size={14} /> Profile
                </button>
                <button type="button" onClick={() => navigate('/settings')}>
                  <Settings size={14} /> Settings
                </button>
                <div className="menu-divider" />
                <button
                  type="button"
                  className="logout-item"
                  onClick={() => {
                    setSidebarMenuOpen(false)
                    void logout()
                  }}
                >
                  <LogOut size={14} /> Log out
                </button>
              </div>
            )}
            <button
              type="button"
              className="user-row-trigger"
              onClick={() => setSidebarMenuOpen((prev) => !prev)}
              aria-expanded={sidebarMenuOpen}
              aria-haspopup="menu"
            >
              <div className="user-avatar">{initials}</div>
              <div className="user-info">
                <b>{displayName}</b>
                <span>Owner · {user?.role || 'VENDOR'}</span>
              </div>
              <ChevronUp className={`menu-chevron ${sidebarMenuOpen ? 'open' : ''}`} />
            </button>
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
            <div className="topbar-user-menu-wrap" ref={topbarUserMenuRef}>
              <button
                type="button"
                className="header-user"
                onClick={() => setTopbarMenuOpen((prev) => !prev)}
                aria-expanded={topbarMenuOpen}
                aria-haspopup="menu"
              >
                <div className="user-avatar">{initials}</div>
                <div>
                  <b>{displayName}</b>
                  <span>{storeName}</span>
                </div>
                <ChevronDown className={`menu-chevron ${topbarMenuOpen ? 'open' : ''}`} />
              </button>
              {topbarMenuOpen && (
                <div className="topbar-dropdown-menu" role="menu">
                  <button type="button" onClick={() => navigate('/profile')}>
                    <User size={14} /> Profile
                  </button>
                  <button type="button" onClick={() => navigate('/settings')}>
                    <Settings size={14} /> Settings
                  </button>
                  <div className="menu-divider" />
                  <button
                    type="button"
                    className="logout-item"
                    onClick={() => {
                      setTopbarMenuOpen(false)
                      void logout()
                    }}
                  >
                    <LogOut size={14} /> Log out
                  </button>
                </div>
              )}
            </div>
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
