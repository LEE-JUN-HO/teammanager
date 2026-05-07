import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function SignupPage() {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    if (password.length < 6)  { setError('비밀번호는 6자 이상이어야 합니다.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-toss-gray-50 to-toss-blue-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm card shadow-modal text-center">
          <CheckCircle size={40} className="text-status-green mx-auto mb-3" />
          <h2 className="text-lg font-bold text-toss-gray-900 mb-2">회원가입 완료</h2>
          <p className="text-sm text-toss-gray-500 mb-1">이메일 인증 링크를 확인해주세요.</p>
          <p className="text-xs text-toss-gray-400 mb-5">
            가입 후 관리자가 역할(viewer/manager)과 팀을 배정해 드립니다.
          </p>
          <button className="btn-primary w-full" onClick={() => navigate('/login')}>로그인으로 이동</button>
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
          <h1 className="text-2xl font-bold text-toss-gray-900">회원가입</h1>
          <p className="text-sm text-toss-gray-400 mt-1">가입 후 관리자가 역할을 배정합니다</p>
        </div>

        <div className="card shadow-modal">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">이름</label>
              <input className="input" placeholder="홍길동" value={name}
                onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label">이메일</label>
              <input type="email" className="input" placeholder="email@company.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">비밀번호 <span className="text-toss-gray-400 font-normal">(6자 이상)</span></label>
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

            <button type="submit" disabled={loading || !name || !email || !password}
              className="btn-primary w-full flex items-center justify-center h-11">
              {loading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : '가입하기'}
            </button>
          </form>

          <p className="text-center text-sm text-toss-gray-500 mt-5">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-toss-blue font-semibold hover:underline">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
