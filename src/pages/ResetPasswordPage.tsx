import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SHARED_ACCOUNTS = ['viewer@bigxdata.io']

export default function ResetPasswordPage() {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return }
    if (password !== confirm)  { setError('비밀번호가 일치하지 않습니다.'); return }
    // 공용 계정은 비밀번호 변경 불가
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email && SHARED_ACCOUNTS.includes(user.email.toLowerCase())) {
      setError('이 계정은 공용 계정으로 비밀번호를 변경할 수 없습니다.')
      return
    }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) setError(err.message)
      else setDone(true)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-toss-gray-50 to-toss-blue-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm card shadow-modal text-center">
          <CheckCircle size={44} className="text-status-green mx-auto mb-3" />
          <h2 className="text-lg font-bold text-toss-gray-900 mb-2">비밀번호 변경 완료</h2>
          <p className="text-sm text-toss-gray-500 mb-6">새 비밀번호로 로그인해주세요.</p>
          <button className="btn-primary w-full" onClick={() => navigate('/login')}>
            로그인하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-toss-gray-50 to-toss-blue-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-toss-blue rounded-2xl shadow-md mb-4">
            <TrendingUp size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-toss-gray-900">새 비밀번호 설정</h1>
          <p className="text-sm text-toss-gray-500 mt-1">사용할 새 비밀번호를 입력해주세요</p>
        </div>

        <div className="card shadow-modal">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">새 비밀번호 <span className="text-toss-gray-400 font-normal">(6자 이상)</span></label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input pr-10"
                  placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} required autoFocus />
                <button type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-toss-gray-400 hover:text-toss-gray-600"
                  onClick={() => setShowPw(v => !v)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">새 비밀번호 확인</label>
              <input type="password" className="input" placeholder="••••••••"
                value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>

            {/* strength indicator */}
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                      password.length >= i * 3
                        ? i <= 2 ? 'bg-status-red' : i === 3 ? 'bg-status-yellow' : 'bg-status-green'
                        : 'bg-toss-gray-200'}`} />
                  ))}
                </div>
                <p className="text-xs text-toss-gray-400">
                  {password.length < 6 ? '너무 짧아요' : password.length < 9 ? '보통' : password.length < 12 ? '좋아요' : '매우 안전해요'}
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-status-red bg-status-red-bg px-3 py-2.5 rounded-xl">
                <AlertCircle size={15} />{error}
              </div>
            )}

            <button type="submit" disabled={loading || !password || !confirm}
              className="btn-primary w-full flex items-center justify-center h-11 mt-2">
              {loading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : '비밀번호 변경하기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
