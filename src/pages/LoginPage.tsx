import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TrendingUp, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      setError('이메일 또는 비밀번호를 확인해주세요.')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-toss-gray-50 to-toss-blue-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-toss-blue rounded-2xl shadow-md mb-4">
            <TrendingUp size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-toss-gray-900">팀 예산관리</h1>
          <p className="text-sm text-toss-gray-500 mt-1">Team Budget Management</p>
        </div>

        <div className="card shadow-modal">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">이메일</label>
              <input type="email" className="input" placeholder="email@company.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">비밀번호</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input pr-10"
                  placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} required />
                <button type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-toss-gray-400"
                  onClick={() => setShowPw(v => !v)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-status-red bg-status-red-bg px-3 py-2.5 rounded-xl">
                <AlertCircle size={15} />{error}
              </div>
            )}

            <button type="submit" disabled={loading || !email || !password}
              className="btn-primary w-full flex items-center justify-center h-11">
              {loading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : '로그인'}
            </button>
          </form>

          <div className="mt-5 space-y-2 text-center text-sm text-toss-gray-500">
            <p>
              계정이 없으신가요?{' '}
              <Link to="/signup" className="text-toss-blue font-semibold hover:underline">회원가입</Link>
            </p>
            <p>
              <Link to="/forgot-password" className="text-toss-gray-400 hover:text-toss-gray-600 hover:underline">
                비밀번호를 잊으셨나요?
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
