import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'

/** 비밀번호 변경이 금지된 공용 계정 이메일 목록 */
const SHARED_ACCOUNTS = ['viewer@bigxdata.io']

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (SHARED_ACCOUNTS.includes(email.trim().toLowerCase())) {
      setError('이 계정은 공용 계정으로 비밀번호를 변경할 수 없습니다.')
      return
    }
    setLoading(true)
    const redirectTo = `${window.location.origin}${window.location.pathname}`
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setLoading(false)
    if (err) setError(err.message)
    else setDone(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-toss-gray-50 to-toss-blue-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-toss-blue rounded-2xl shadow-md mb-4">
            <TrendingUp size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-toss-gray-900">비밀번호 찾기</h1>
          <p className="text-sm text-toss-gray-500 mt-1">가입한 이메일로 재설정 링크를 보내드려요</p>
        </div>

        <div className="card shadow-modal">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle size={40} className="text-status-green mx-auto mb-3" />
              <p className="font-semibold text-toss-gray-900 mb-1">이메일을 확인해주세요</p>
              <p className="text-sm text-toss-gray-500 mb-5">
                <span className="font-medium text-toss-gray-700">{email}</span>로<br />
                비밀번호 재설정 링크를 발송했어요.
              </p>
              <Link to="/login" className="btn-secondary inline-flex items-center gap-2 text-sm">
                <ArrowLeft size={15} />로그인으로 돌아가기
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">가입한 이메일</label>
                <input type="email" className="input" placeholder="email@company.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-status-red bg-status-red-bg px-3 py-2.5 rounded-xl">
                  <AlertCircle size={15} />{error}
                </div>
              )}

              <button type="submit" disabled={loading || !email}
                className="btn-primary w-full flex items-center justify-center h-11">
                {loading
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : '재설정 링크 보내기'}
              </button>

              <Link to="/login"
                className="flex items-center justify-center gap-1.5 text-sm text-toss-gray-500 hover:text-toss-gray-700 transition-colors mt-2">
                <ArrowLeft size={14} />로그인으로 돌아가기
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
