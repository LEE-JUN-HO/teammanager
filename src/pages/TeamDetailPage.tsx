import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import Header from '../components/layout/Header'
import { formatKRW, formatKRWFull, getFiscalMonths } from '../utils/budget'
import StatusBadge from '../components/ui/StatusBadge'
import ProgressBar from '../components/ui/ProgressBar'
import { ChevronLeft, Edit2, Check, X } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

function EditableCell({ value, onSave, prefix = '' }: {
  value: number; onSave: (v: number) => void; prefix?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  const commit = () => {
    const n = Number(draft.replace(/,/g, ''))
    if (!isNaN(n) && n >= 0) onSave(n)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(String(value)); setEditing(true) }}
        className="flex items-center gap-1 text-sm text-toss-gray-900 hover:text-toss-blue group"
      >
        {prefix}{value.toLocaleString()}
        <Edit2 size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        className="w-24 px-2 py-1 text-sm border border-toss-blue rounded-lg focus:outline-none"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      />
      <button onClick={commit} className="text-status-green"><Check size={14} /></button>
      <button onClick={() => setEditing(false)} className="text-toss-gray-400"><X size={14} /></button>
    </div>
  )
}

export default function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const { selectedFiscalYear, getTeamSummary, updateHeadcount, updateActualAmount, currentUser } = useAppStore()
  const summary = getTeamSummary(teamId!, selectedFiscalYear)

  if (!summary) return <div className="p-6 text-toss-gray-500">팀을 찾을 수 없어요.</div>

  const fiscalMonths = getFiscalMonths(selectedFiscalYear)
  const canEdit = currentUser?.role === 'admin' || currentUser?.teamId === teamId

  const chartData = fiscalMonths.map(fm => {
    const md = summary.monthlyData.find(m => m.month === fm.month)
    return {
      name: fm.shortLabel,
      배정: Math.round((md?.allocated ?? 0) / 10000),
      집행: Math.round((md?.actual ?? 0) / 10000),
    }
  })

  return (
    <div>
      <Header title={summary.team.name} subtitle="예산 및 인원 현황" />
      <div className="p-6 space-y-6">

        {/* Back + summary */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-1 text-sm">
            <ChevronLeft size={16} /> 목록
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '연간 배정 예산', value: formatKRW(summary.totalAllocated), sub: `인당 ${formatKRW(600_000)}` },
            { label: '집행 금액', value: formatKRW(summary.totalActual), sub: '현재까지' },
            { label: '잔여 예산', value: formatKRW(summary.totalAllocated - summary.totalActual), sub: '' },
            { label: '집행률', value: `${summary.executionRate.toFixed(1)}%`, sub: '' },
          ].map(k => (
            <div key={k.label} className="card">
              <p className="text-xs text-toss-gray-500">{k.label}</p>
              <p className="text-xl font-bold text-toss-gray-900 mt-1">{k.value}</p>
              {k.sub && <p className="text-xs text-toss-gray-400 mt-0.5">{k.sub}</p>}
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="card">
          <h2 className="text-sm font-semibold text-toss-gray-700 mb-4">월별 집행 추이 (만원)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8B95A1' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8B95A1' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(v: number) => [`${v.toLocaleString()}만원`]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="배정" stroke="#E6E8EB" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="집행" stroke="#0064FF" strokeWidth={2.5} dot={{ r: 4, fill: '#0064FF' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly table */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-toss-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-toss-gray-700">월별 상세 내역</h2>
            {canEdit && (
              <span className="text-xs text-toss-blue bg-toss-blue-bg px-2.5 py-1 rounded-full">
                클릭하여 수정 가능
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-toss-gray-100 bg-toss-gray-50">
                  {['월', '인원 (명)', '배정 예산', '집행 금액', '집행률', '상태'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-toss-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-toss-gray-100">
                {fiscalMonths.map((fm, i) => {
                  const md = summary.monthlyData[i]
                  const hasData = md.actual > 0
                  return (
                    <tr key={fm.month} className="hover:bg-toss-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-toss-gray-700">{fm.label}</td>
                      <td className="px-5 py-3.5">
                        {canEdit ? (
                          <EditableCell
                            value={md.headcount}
                            onSave={v => updateHeadcount(teamId!, selectedFiscalYear, fm.month, v)}
                          />
                        ) : (
                          <span className="text-sm text-toss-gray-900">{md.headcount}명</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-toss-gray-700">{formatKRWFull(md.allocated)}</td>
                      <td className="px-5 py-3.5">
                        {canEdit ? (
                          <EditableCell
                            value={md.actual}
                            onSave={v => updateActualAmount(teamId!, selectedFiscalYear, fm.month, v)}
                          />
                        ) : (
                          <span className="text-sm text-toss-gray-900">{formatKRWFull(md.actual)}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 w-40">
                        {hasData ? (
                          <ProgressBar rate={md.executionRate} status={md.status} showLabel height={5} />
                        ) : (
                          <span className="text-xs text-toss-gray-400">미집행</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {hasData ? (
                          <StatusBadge status={md.status} size="sm" />
                        ) : (
                          <span className="text-xs text-toss-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-toss-gray-100 bg-toss-gray-50">
                  <td className="px-5 py-3 text-sm font-bold text-toss-gray-900">합계</td>
                  <td className="px-5 py-3 text-sm text-toss-gray-500">-</td>
                  <td className="px-5 py-3 text-sm font-semibold text-toss-gray-700">{formatKRWFull(summary.totalAllocated)}</td>
                  <td className="px-5 py-3 text-sm font-bold text-toss-gray-900">{formatKRWFull(summary.totalActual)}</td>
                  <td className="px-5 py-3 w-40">
                    <ProgressBar rate={summary.executionRate} status={summary.status} showLabel height={5} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={summary.status} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
