import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, ClipboardList, Settings, LogOut, ChevronRight, TrendingUp, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useAppStore } from '../../store/appStore'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: '전체 현황' },
  { to: '/teams',     icon: Users,           label: '팀별 예산' },
  { to: '/expenses',  icon: ClipboardList,   label: '예산 집행 입력' },
  { to: '/admin',     icon: Settings,        label: '관리자 설정', adminOnly: false },
]

function NavItem({ to, icon: Icon, label, onClick }: {
  to: string; icon: React.ElementType; label: string; onClick?: () => void
}) {
  return (
    <NavLink to={to} onClick={onClick} className={({ isActive }) =>
      clsx('flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150',
        isActive ? 'bg-toss-blue text-white shadow-sm'
                 : 'text-toss-gray-600 hover:bg-toss-gray-100 hover:text-toss-gray-900')}>
      <Icon size={18} />
      {label}
      <ChevronRight size={14} className="ml-auto opacity-50" />
    </NavLink>
  )
}

export default function Sidebar() {
  const { profile, logout } = useAuthStore()
  const { selectedFiscalYear } = useAppStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => { await logout(); navigate('/login') }

  const SidebarContent = ({ onNav }: { onNav?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-toss-blue rounded-xl flex items-center justify-center">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-toss-gray-900 leading-tight">팀 예산관리</p>
            <p className="text-[11px] text-toss-gray-500 leading-tight">{selectedFiscalYear}년도</p>
          </div>
        </div>
      </div>

      <div className="mx-4 h-px bg-toss-gray-100 mb-4" />

      <nav className="px-3 flex-1 space-y-1">
        {navItems.map(item => (
          <NavItem key={item.to} {...item} onClick={onNav} />
        ))}
      </nav>

      <div className="p-4 mt-4">
        <div className="bg-toss-gray-50 rounded-xl p-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-toss-blue rounded-full flex items-center justify-center text-white text-xs font-bold">
              {profile?.name?.[0] ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-toss-gray-900 truncate">{profile?.name}</p>
              <p className="text-[11px] text-toss-gray-500 truncate">{profile?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-toss-gray-500 hover:text-status-red transition-colors">
            <LogOut size={13} />로그아웃
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white rounded-xl shadow-card flex items-center justify-center"
        onClick={() => setMobileOpen(v => !v)}>
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
      {mobileOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMobileOpen(false)} />}
      <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-white border-r border-toss-gray-100 fixed left-0 top-0 bottom-0 z-30">
        <SidebarContent />
      </aside>
      <aside className={clsx('lg:hidden fixed left-0 top-0 bottom-0 z-50 w-64 bg-white shadow-modal transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <SidebarContent onNav={() => setMobileOpen(false)} />
      </aside>
    </>
  )
}
