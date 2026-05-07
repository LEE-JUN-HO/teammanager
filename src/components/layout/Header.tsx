import { ChevronDown } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'

interface Props { title: string; subtitle?: string }

export default function Header({ title, subtitle }: Props) {
  const { selectedFiscalYear, setSelectedFiscalYear } = useAppStore()
  const { profile } = useAuthStore()
  const years = [2024, 2025, 2026]

  return (
    <header className="bg-white border-b border-toss-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-bold text-toss-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-toss-gray-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {profile && (
          <div className="hidden sm:flex items-center gap-2 bg-toss-gray-50 rounded-xl px-3 py-2">
            <span className="text-xs font-semibold text-toss-blue">{profile.role}</span>
            <span className="text-xs text-toss-gray-500">{profile.name}</span>
          </div>
        )}
        <div className="relative">
          <select value={selectedFiscalYear} onChange={e => setSelectedFiscalYear(Number(e.target.value))}
            className="appearance-none bg-toss-gray-50 border-0 text-sm font-semibold text-toss-gray-700
                       pl-3 pr-8 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-toss-blue cursor-pointer">
            {years.map(y => <option key={y} value={y}>{y}년도</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-toss-gray-500 pointer-events-none" />
        </div>
      </div>
    </header>
  )
}
