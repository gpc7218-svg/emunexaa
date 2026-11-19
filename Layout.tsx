import { ReactNode, useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Smartphone,
  PlusCircle,
  Upload,
  Monitor,
  Activity,
  Settings,
  AlertTriangle,
  Download,
  Palette,
  Terminal,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sun,
  Moon,
  Globe,
  Info,
  HelpCircle,
  Github,
  Twitter,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useThemeStore } from '@/hooks/useThemeStore'
import { useLanguageStore } from '@/hooks/useLanguageStore'

const navigation = [
  { name: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'devices', href: '/devices', icon: Smartphone },
  { name: 'createDevice', href: '/devices/create', icon: PlusCircle },
  { name: 'importImage', href: '/import', icon: Upload },
  { name: 'liveWindow', href: '/live', icon: Monitor, hidden: true }, // Hidden from nav, accessed via device
  { name: 'diagnostics', href: '/diagnostics', icon: Activity },
  { name: 'settings', href: '/settings', icon: Settings },
]

export function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { theme, toggleTheme } = useThemeStore()
  const { language, setLanguage } = useLanguageStore()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [location.pathname])

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleCollapseToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return (
    <div className="min-h-screen flex bg-surface-primary">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && window.innerWidth < 1024 && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:static z-50 flex flex-col h-screen bg-surface-secondary border-r border-border-primary transition-all duration-300 ease-out',
          sidebarCollapsed ? 'w-16' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        aria-label="Main navigation"
      >
        {/* Logo & Brand */}
        <div className={clsx('flex items-center gap-3 h-16 px-4 border-b border-border-primary', sidebarCollapsed && 'justify-center')}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-xl text-text-primary">EmuNexa</span>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={handleCollapseToggle}
              className="ml-auto p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors"
              aria-label={sidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1" aria-label="Main navigation">
          {navigation.map((item) => {
            if (item.hidden) return null
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary',
                  'transition-all duration-150 ease-out',
                  'hover:bg-surface-hover hover:text-text-primary',
                  isActive && 'bg-brand-500/10 text-brand-600 border-l-3 border-brand-500',
                  sidebarCollapsed && 'justify-center'
                )}
                aria-current={isActive ? 'page' : undefined}
                title={sidebarCollapsed ? t(item.name) : undefined}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                {!sidebarCollapsed && <span className="font-medium">{t(item.name)}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        <div className={clsx('p-4 border-t border-border-primary', sidebarCollapsed && 'items-center')}>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={clsx(
                'p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors',
                sidebarCollapsed && 'mx-auto'
              )}
              aria-label={theme === 'dark' ? t('light') : t('dark')}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {!sidebarCollapsed && (
              <div className="flex-1">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
                  className="w-full px-2 py-1.5 bg-surface-tertiary border border-border-primary rounded-lg text-sm text-text-primary focus:border-focus focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none bg-no-repeat bg-right pr-8"
                  style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '1.5em 1.5em'
                  }}
                >
                  <option value="en">{t('english')}</option>
                  <option value="ar">{t('arabic')}</option>
                </select>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="mt-4 pt-4 border-t border-border-primary space-y-2">
              <NavLink
                to="/settings"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
              >
                <Info className="w-5 h-5" />
                <span>{t('about')}</span>
              </NavLink>
              <NavLink
                to="/settings"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
              >
                <HelpCircle className="w-5 h-5" />
                <span>{t('help')}</span>
              </NavLink>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Top bar */}
        <header className={clsx('h-16 bg-surface-primary border-b border-border-primary flex items-center justify-between px-4 lg:px-8', sidebarCollapsed && 'lg:ml-16', !sidebarCollapsed && 'lg:ml-64')}>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSidebarToggle}
              className="lg:hidden p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="heading-5 lg:heading-4">{t(location.pathname.split('/')[1] || 'dashboard')}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle (duplicate for top bar on desktop) */}
            <button
              onClick={toggleTheme}
              className="hidden lg:flex p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors"
              aria-label={theme === 'dark' ? t('light') : t('dark')}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Language selector */}
            <div className="hidden lg:block">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
                className="px-2 py-1.5 bg-surface-tertiary border border-border-primary rounded-lg text-sm text-text-primary focus:border-focus focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none bg-no-repeat bg-right pr-8 cursor-pointer"
                style={{
                  backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.5em 1.5em'
                }}
              >
                <option value="en">{t('english')}</option>
                <option value="ar">{t('arabic')}</option>
              </select>
            </div>

            {/* Quick actions */}
            <NavLink
              to="/devices/create"
              className="hidden lg:btn-primary"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('createDevice')}</span>
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 lg:ml-0">
          {children}
        </main>
      </div>
    </div>
  )
}