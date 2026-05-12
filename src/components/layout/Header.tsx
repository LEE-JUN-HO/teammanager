import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, KeyRound, AlertCircle, Check } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import { getCurrentFiscalYear } from '../../utils/budget'
import { supabase } from '../../lib/supabase'

const SYSTEM_START_YEAR = 2026
const SHARED_ACCOUNT = 'viewer@bigxdata.io'

interface Props { title: string; subtitle?: string }

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { profile } = useAuthStore()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    if (!success) return
    const id = setTimeout(onClose, 1500)
    return () => clearTimeout(id)
  }, [success, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (profile?.email === SHARED_ACCOUNT) {
      setError('공용 계정은 비밀번호를 변경할 수 없습니다.')
      return
    }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return }
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSuccess(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm card shadow-modal">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-toss-gray-900">비밀번호 변경</h2>
          <button onClick={onClose} className="text-toss-gray-400 hover:text-toss-gray-700 text-lg leading-none">✕</button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-4 gap-3">
            <div className="w-10 h-10 rounded-full bg-status-green-bg flex items-center justify-center">
              <Check size={20} className="text-status-green" />
            </div>
            <p className="text-sm font-semibold text-toss-gray-900">변경 완료</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">새 비밀번호 <span className="text-toss-gray-400 font-normal">(6자 이상)</span></label>
              <input type="password" className="input" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div>
              <label className="label">비밀번호 확인</label>
              <input type="password" className="input" placeholder="••••••••"
                value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-status-red bg-status-red-bg px-3 py-2.5 rounded-xl">
                <AlertCircle size={15} />{error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-toss-gray-200 text-sm font-semibold text-toss-gray-700 hover:bg-toss-gray-50 transition-colors">
                취소
              </button>
              <button type="submit" disabled={loading || !password || !confirm}
                className="flex-1 btn-primary flex items-center justify-center h-10">
                {loading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : '변경'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function Header({ title, subtitle }: Props) {
  const { selectedFiscalYear, setSelectedFiscalYear } = useAppStore()
  const { profile, logout } = useAuthStore()
  const navigate = useNavigate()
  const currentFY = getCurrentFiscalYear()
  const years = Array.from(
    { length: Math.max(currentFY - SYSTEM_START_YEAR + 1, 1) },
    (_, i) => SYSTEM_START_YEAR + i
  )

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    setDropdownOpen(false)
    await logout()
    navigate('/login')
  }

  const handlePasswordChange = () => {
    setDropdownOpen(false)
    setShowPasswordModal(true)
  }

  return (
    <>
      <header className="bg-white border-b border-toss-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-lg font-bold text-toss-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-toss-gray-500">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          {/* 회계연도 선택 */}
          <div className="relative">
            <select value={selectedFiscalYear} onChange={e => setSelectedFiscalYear(Number(e.target.value))}
              className="appearance-none bg-toss-gray-50 border-0 text-sm font-semibold text-toss-gray-700
                         pl-3 pr-8 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-toss-blue cursor-pointer">
              {years.map(y => <option key={y} value={y}>{y}년도</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-toss-gray-500 pointer-events-none" />
          </div>

          {/* 프로필 드롭다운 */}
          {profile && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="flex items-center gap-2 bg-toss-gray-50 hover:bg-toss-gray-100 rounded-xl px-3 py-2 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-toss-blue flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {profile.name?.[0] ?? '?'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-toss-gray-900 leading-tight">{profile.name}</p>
                  <p className="text-[11px] text-toss-gray-500 leading-tight">{profile.role}</p>
                </div>
                <ChevronDown size={13} className={`text-toss-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-modal border border-toss-gray-100 overflow-hidden z-50">
                  {/* 유저 정보 */}
                  <div className="px-4 py-3 border-b border-toss-gray-100">
                    <p className="text-sm font-bold text-toss-gray-900">{profile.name}</p>
                    <p className="text-xs text-toss-gray-500 mt-0.5 truncate">{profile.email}</p>
                    <span className={`inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      profile.role === 'admin'   ? 'bg-toss-blue-bg text-toss-blue' :
                      profile.role === 'manager' ? 'bg-purple-100 text-purple-700' :
                                                   'bg-toss-gray-100 text-toss-gray-600'}`}>
                      {profile.role}
                    </span>
                  </div>

                  {/* 메뉴 */}
                  <div className="py-1">
                    <button onClick={handlePasswordChange}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-toss-gray-700 hover:bg-toss-gray-50 transition-colors">
                      <KeyRound size={15} className="text-toss-gray-400" />
                      비밀번호 변경
                    </button>
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-status-red hover:bg-status-red-bg transition-colors">
                      <LogOut size={15} />
                      로그아웃
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </>
  )
}
