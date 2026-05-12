import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Clock, LogOut } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function PendingApprovalPage() {
  const { session, profile, loading, logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!session) { navigate('/login', { replace: true }); return }
    if (profile && profile.role !== 'pending') { navigate('/dashboard', { replace: true }) }
  }, [session, profile, loading, navigate])

  if (loading) return null

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-toss-gray-50 to-toss-blue-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm card shadow-modal text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-toss-blue rounded-2xl shadow-md mb-5 mx-auto">
          <TrendingUp size={26} className="text-white" />
        </div>

        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock size={22} className="text-amber-500" />
        </div>

        <h2 className="text-lg font-bold text-toss-gray-900 mb-2">승인 대기 중</h2>
        <p className="text-sm text-toss-gray-500 mb-1">
          관리자가 계정을 검토하고 있습니다.
        </p>
        <p className="text-xs text-toss-gray-400 mb-6">
          승인이 완료되면 담당자에게 별도로 안내됩니다.
        </p>

        {profile && (
          <div className="bg-toss-gray-50 rounded-xl px-4 py-3 mb-6 text-left">
            <p className="text-xs text-toss-gray-500">가입 계정</p>
            <p className="text-sm font-semibold text-toss-gray-900 mt-0.5">{profile.name}</p>
            <p className="text-xs text-toss-gray-500 mt-0.5">{profile.email}</p>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-toss-gray-200 text-sm font-semibold text-toss-gray-700 hover:bg-toss-gray-50 transition-colors"
        >
          <LogOut size={15} />
          로그아웃
        </button>
      </div>
    </div>
  )
}
