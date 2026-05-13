import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TrendingUp, XCircle, CheckCircle, AlertCircle } from 'lucide-react'

const FN_BASE = 'https://qoaubeeiljddxqdkdcus.supabase.co/functions/v1'

interface RequestDetails {
  teamName: string
  fiscalYear: number
  month: number
  expenseDate: string
  userName: string
  category: string
  description: string | null
  amount: number
  requesterName: string
}

export default function RejectPage() {
  const { token } = useParams<{ token: string }>()
  const [req, setReq]         = useState<RequestDetails | null>(null)
  const [reason, setReason]   = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch(`${FN_BASE}/approval-action?action=reject&token=${token}`)
      .then(async res => {
        if (res.status === 409) { setError('이미 처리된 요청입니다.'); return }
        if (!res.ok)            { setError('요청을 찾을 수 없습니다.'); return }
        setReq(await res.json())
      })
      .catch(() => setError('서버 오류가 발생했습니다.'))
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`${FN_BASE}/approval-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reason: reason.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error === 'already_processed' ? '이미 처리된 요청입니다.' : '오류가 발생했습니다.')
        return
      }
      setDone(true)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-toss-gray-50 to-toss-blue-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-toss-blue rounded-2xl shadow-md mb-3">
            <TrendingUp size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-toss-gray-900">예산 집행 반려</h1>
        </div>

        <div className="card shadow-modal">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : done ? (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <CheckCircle size={44} className="text-status-green" />
              <p className="font-bold text-toss-gray-900">반려 처리 완료</p>
              <p className="text-sm text-toss-gray-500">요청자에게 반려 사유가 전달되었습니다.</p>
            </div>
          ) : error && !req ? (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <XCircle size={44} className="text-status-red" />
              <p className="font-bold text-toss-gray-900">{error}</p>
            </div>
          ) : req ? (
            <>
              <h2 className="font-bold text-toss-gray-900 mb-4">요청 내용</h2>
              <div className="bg-toss-gray-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
                {[
                  { label: '팀',      value: req.teamName },
                  { label: '요청자',  value: req.requesterName },
                  { label: '사용날짜', value: req.expenseDate },
                  { label: '사용자',  value: req.userName },
                  { label: '항목',    value: req.category },
                  { label: '내용',    value: req.description ?? '-' },
                  { label: '금액',    value: `${Number(req.amount).toLocaleString()}원` },
                ].map(r => (
                  <div key={r.label} className="flex justify-between gap-4">
                    <span className="text-toss-gray-500 flex-shrink-0">{r.label}</span>
                    <span className="font-medium text-toss-gray-900 text-right">{r.value}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                <label className="label block mb-1">반려 사유 *</label>
                <textarea
                  className="input min-h-[100px] resize-none w-full"
                  placeholder="반려 사유를 입력해주세요."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  required
                />

                {error && (
                  <div className="flex items-center gap-2 text-sm text-status-red bg-status-red-bg px-3 py-2.5 rounded-xl mt-3">
                    <AlertCircle size={15} />{error}
                  </div>
                )}

                <button type="submit" disabled={submitting || !reason.trim()}
                  className="w-full mt-4 py-3 rounded-xl bg-status-red text-white font-bold text-sm flex items-center justify-center disabled:opacity-50 transition-opacity">
                  {submitting
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : '반려 처리'}
                </button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
