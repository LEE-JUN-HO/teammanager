import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import * as db from '../lib/db'
import Header from '../components/layout/Header'
import { formatKRW, formatKRWFull, getFiscalMonths, calcAllocated, calcExecutionRate, getExecutionStatus } from '../utils/budget'
import StatusBadge from '../components/ui/StatusBadge'
import ProgressBar from '../components/ui/ProgressBar'
import { ChevronLeft, ClipboardList } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Team, MonthlyHeadcount, TrafficLightConfig, StatusType } from '../types'

export default function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const { selectedFiscalYear } = useAppStore()
  const { profile } = useAuthStore()

  const [team, setTeam] = useState<Team | null>(null)
  const [headcounts, setHeadcounts] = useState<MonthlyHeadcount[]>([])
  const [expenseByMonth, setExpenseByMonth] = useState<Record<number, number>>({})
  const [config, setConfig] = useState<TrafficLightConfig>({ greenMin: 80, greenMax: 100, yellowLowMin: 60, yellowHighMax: 120 })
  const [loading, setLoading] = useState(true)
  const [hcEdits, setHcEdits] = useState<Record<number, string>>({})

  const canEdit = profile?.role === 'admin' || (profile?.role === 'manager' && profile?.teamId === teamId)

  useEffect(() => { load() }, [teamId, selectedFiscalYear])

  async function load() {
    if (!teamId) return
    setLoading(true)
    const [teams, hcs, expItems, cfg] = await Promise.all([
      db.getTeams(),
      db.getHeadcounts(selectedFiscalYear),
      db.getExpenseItems(teamId, selectedFiscalYear),
      db.getTrafficLightConfig(),
    ])
    setTeam(teams.find(t => t.id === teamId) ?? null)
    setHeadcounts(hcs.filter(h => h.teamId === teamId))
    const byMonth: Record<number, number> = {}
    for (const e of expItems) byMonth[e.month] = (byMonth[e.month] ?? 0) + e.amount
    setExpenseByMonth(byMonth)
    setConfig(cfg)
    setLoading(false)
  }

  const fiscalMonths = getFiscalMonths(selectedFiscalYear)

  const monthlyData = fiscalMonths.map(fm => {
    const hc       = headcounts.find(h => h.month === fm.month)?.headcount ?? 0
    const alloc    = calcAllocated(hc)
    const actual   = expenseByMonth[fm.month] ?? 0
    const rate     = calcExecutionRate(actual, alloc)
    const status: StatusType = actual > 0 ? getExecutionStatus(rate, config) : 'green'
    return { month: fm.month, headcount: hc, allocated: alloc, actual, executionRate: rate, status, label: fm.label, short: fm.shortLabel }
  })

  const totalAllocated = monthlyData.reduce((s, m) => s + m.allocated, 0)
  const totalActual    = monthlyData.reduce((s, m) => s + m.actual,    0)
  const execRate       = calcExecutionRate(totalActual, totalAllocated)
  const overallStatus: StatusType = totalActual > 0 ? getExecutionStatus(execRate, config) : 'green'

  const chartData = monthlyData.map(m => ({
    name: m.short,
    배정: Math.round(m.allocated / 10000),
    집행: Math.round(m.actual / 10000),
  }))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!team) return <div className="p-6 text-toss-gray-500">팀을 찾을 수 없어요.</div>

  return (
    <div>
      <Header title={team.name} subtitle="월별 예산 현황" />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-1 text-sm">
            <ChevronLeft size={16} />목록
          </button>
          {canEdit && (
            <button onClick={() => navigate(`/expenses/${teamId}`)}
              className="btn-secondary flex items-center gap-1.5 text-sm">
              <ClipboardList size={15} />집행 항목 입력
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '연간 배정 예산', value: formatKRW(totalAllocated) },
            { label: '집행 금액',      value: formatKRW(totalActual) },
            { label: '잔여 예산',      value: formatKRW(totalAllocated - totalActual) },
            { label: '집행률',         value: `${execRate.toFixed(1)}%` },
          ].map(k => (
            <div key={k.label} className="card">
              <p className="text-xs text-toss-gray-500">{k.label}</p>
              <p className="text-xl font-bold text-toss-gray-900 mt-1">{k.value}</p>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-toss-gray-700 mb-4">월별 집행 추이 (만원)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8B95A1' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8B95A1' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(v: number) => [`${v.toLocaleString()}만원`]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="배정" stroke="#E6E8EB" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="집행" stroke="#0064FF" strokeWidth={2.5} dot={{ r: 4, fill: '#0064FF' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-toss-gray-100">
            <h2 className="text-sm font-semibold text-toss-gray-700">월별 상세</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-toss-gray-100 bg-toss-gray-50">
                  {['월','인원','배정 예산','집행 금액','집행률','상태'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-toss-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-toss-gray-100">
                {monthlyData.map(m => (
                  <tr key={m.month} className="hover:bg-toss-gray-50 cursor-pointer"
                    onClick={() => canEdit && navigate(`/expenses/${teamId}`)}>
                    <td className="px-5 py-3.5 text-sm font-medium text-toss-gray-700">{m.label}</td>
                    <td className="px-5 py-3.5 text-sm">
                      {canEdit ? (
                        <input
                          type="number" min={0}
                          className="input w-20 py-1 text-sm text-center"
                          value={hcEdits[m.month] ?? m.headcount}
                          onChange={e => setHcEdits(prev => ({ ...prev, [m.month]: e.target.value }))}
                          onBlur={async () => {
                            const val = Number(hcEdits[m.month])
                            if (hcEdits[m.month] !== undefined && val !== m.headcount && !isNaN(val)) {
                              await db.upsertHeadcount(teamId!, selectedFiscalYear, m.month, val)
                              load()
                            }
                          }}
                        />
                      ) : (
                        <span>{m.headcount}명</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-toss-gray-700">{formatKRWFull(m.allocated)}</td>
                    <td className="px-5 py-3.5 text-sm font-medium">{m.actual > 0 ? formatKRWFull(m.actual) : <span className="text-toss-gray-400">-</span>}</td>
                    <td className="px-5 py-3.5 w-36">
                      {m.actual > 0
                        ? <ProgressBar rate={m.executionRate} status={m.status} showLabel height={5} />
                        : <span className="text-xs text-toss-gray-400">미집행</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {m.actual > 0 ? <StatusBadge status={m.status} size="sm" /> : <span className="text-xs text-toss-gray-400">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-toss-gray-100 bg-toss-gray-50">
                  <td className="px-5 py-3 text-sm font-bold" colSpan={2}>합계</td>
                  <td className="px-5 py-3 text-sm font-semibold">{formatKRWFull(totalAllocated)}</td>
                  <td className="px-5 py-3 text-sm font-bold text-toss-blue">{formatKRWFull(totalActual)}</td>
                  <td className="px-5 py-3 w-36"><ProgressBar rate={execRate} status={overallStatus} showLabel height={5} /></td>
                  <td className="px-5 py-3"><StatusBadge status={overallStatus} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
