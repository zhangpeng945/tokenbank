import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Landmark,
  BarChart3,
  KeyRound,
  FileText,
  Shield,
  LogOut,
  Menu,
  X,
  Wallet,
} from 'lucide-react'
import { getBalance } from '../api/user'
import type { BalanceResponse } from '../types'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/bank', label: 'Bank', icon: Landmark },
  { to: '/usage', label: 'Usage', icon: BarChart3 },
  { to: '/api-keys', label: 'API Keys', icon: KeyRound },
  { to: '/docs', label: 'Docs', icon: FileText },
]

const adminItem: NavItem = { to: '/admin', label: 'Admin', icon: Shield }

export default function Layout() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ id: number; email: string; role: string } | null>(null)
  const [balance, setBalance] = useState<BalanceResponse | null>(null)

  useEffect(() => {
    const userStr = localStorage.getItem('tokenbank_user')
    if (userStr) {
      try {
        setUser(JSON.parse(userStr))
      } catch {
        // invalid JSON – ignore
      }
    }
    getBalance()
      .then(setBalance)
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('tokenbank_token')
    localStorage.removeItem('tokenbank_user')
    navigate('/login')
  }

  const items: NavItem[] =
    user?.role === 'admin' ? [...navItems, adminItem] : navItems

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-slate-800 text-slate-100 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-700 px-6">
          <div className="flex items-center gap-2">
            <Landmark className="h-7 w-7 text-indigo-400" />
            <span className="text-lg font-bold tracking-tight">TokenBank</span>
          </div>
          <button
            className="text-slate-400 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 space-y-1 px-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-700 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700/60 hover:text-white"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
          <div className="flex items-center gap-4">
            <button
              className="text-gray-600 hover:text-gray-900 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            {balance && (
              <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5">
                <Wallet className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700">Balance</span>
                <span className="text-sm font-bold text-indigo-900">
                  {balance.balance.toLocaleString()}
                </span>
                <span className="text-xs text-indigo-400">tokens</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <span className="hidden text-sm font-medium text-gray-700 sm:block">
                  {user.email}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
