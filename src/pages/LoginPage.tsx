import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAppStore } from '../store'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login, currentUser } = useAppStore()
  const navigate = useNavigate()

  if (currentUser) {
    navigate('/dashboard', { replace: true })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    const ok = login(email, password)
    setLoading(false)
    if (ok) {
      navigate('/dashboard')
    } else {
      setError('이메일 또는 비밀번호를 확인해주세요.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-toss-gray-50 to-toss-blue-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-toss-blue rounded-2xl shadow-md mb-4">
            <TrendingUp size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-toss-gray-900">팀 예산관리</h1>
          <p className="text-sm text-toss-gray-500 mt-1">Team Budget Management</p>
        </div>

        {/* Card */}
        <div className="card shadow-modal">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">이메일</label>
              <input
                type="email"
                className="input"
                placeholder="email@bigxdata.io"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="label">비밀번호</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-toss-gray-400 hover:text-toss-gray-600"
                  onClick={() => setShowPw(v => !v)}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-status-red bg-status-red-bg px-3 py-2.5 rounded-xl">
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="btn-primary w-full flex items-center justify-center h-11 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : '로그인'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-toss-gray-100">
            <p className="text-xs text-toss-gray-500 font-medium mb-2">테스트 계정</p>
            <div className="space-y-1.5">
              {[
                { email: 'admin@bigxdata.io', role: '관리자' },
                { email: 'dev@bigxdata.io', role: '개발팀 매니저' },
                { email: 'viewer@bigxdata.io', role: '조회자' },
              ].map(u => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => { setEmail(u.email); setPassword('test') }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-toss-gray-50 transition-colors flex justify-between"
                >
                  <span className="text-xs text-toss-gray-600">{u.email}</span>
                  <span className="text-[11px] text-toss-gray-400">{u.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
