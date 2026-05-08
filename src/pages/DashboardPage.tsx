import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import * as db from '../lib/db'
import Header from '../components/layout/Header'
import { formatKRW, getFiscalMonths, DEFAULT_CONFIG } from '../utils/budget'
import StatusBadge, { StatusDot } from '../components/ui/StatusBadge'
import ProgressBar from '../components/ui/ProgressBar'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Users, Wallet, TrendingUp, AlertTriangle } from 'lucide-react'
import type { TeamBudgetSummary, TrafficLightConfig, StatusType } from '../types'

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="card flex items-start gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color + '20' }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-sm text-toss-gray-500">{label}</p>
        <p className="text-xl font-bold text-toss-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-toss-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { selectedFiscalYear } = useAppStore()
  const { profile } = useAuthStore()
  const navigate = useNavigate()

  const [summaries, setSummaries] = useState<TeamBudgetSummary[]>([])
  const [config, setConfig] = useState<TrafficLightConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [selectedFiscalYear])

  async function load() {
    setLoading(true)
    try {
      const cfg = await db.getTrafficLightConfig()
      const data = await db.getTeamBudgetSummaries(selectedFiscalYear, cfg)
      setConfig(cfg)
      setSummaries(data)
    } finally {
      setLoading(false)
    }
  }

  const totalAllocated = summaries.reduce((s, t) => s + t.totalAllocated, 0)
  const totalActual    = summaries.reduce((s, t) => s + t.totalActual, 0)
  const orgRate        = totalAllocated > 0 ? totalActual / totalAllocated * 100 : 0
  const alertCount     = summaries.filter(s => s.status === 'red').length
  const totalHC        = summaries.reduce((s, t) => {
    const avg = t.monthlyData.filter(m => m.headcount > 0)
    return s + (avg.length ? avg.reduce((a, m) => a + m.headcount, 0) / avg.length : 0)
  }, 0)

  const orgStatus: StatusType = summaries.some(s => s.status === 'red') ? 'red'
    : summaries.some(s => s.status === 'yellow') ? 'yellow' : 'green'

  const fiscalMonths = getFiscalMonths(selectedFiscalYear)
  const chartData = fiscalMonths.map(fm => ({
    name: fm.shortLabel,
    배정예산: Math.round(summaries.reduce((s, t) => s + (t.monthlyData.find(m => m.month === fm.month)?.allocated ?? 0), 0) / 10000),
    집행금액: Math.round(summaries.reduce((s, t) => s + (t.monthlyData.find(m => m.month === fm.month)?.actual ?? 0), 0) / 10000),
  }))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <Header title="전체 현황" subtitle={`${selectedFiscalYear}년 2월 ~ ${selectedFiscalYear + 1}년 1월`} />
      <div className="p-6 space-y-6">

        {/* Org status banner */}
        <div className={`rounded-2xl px-5 py-4 flex items-center gap-4 ${
          orgStatus === 'green' ? 'bg-status-green-bg' :
          orgStatus === 'yellow' ? 'bg-status-yellow-bg' : 'bg-status-red-bg'}`}>
          <StatusDot status={orgStatus} size={14} />
          <div>
            <p className="font-semibold text-toss-gray-900 text-sm">
              전체 조직 예산 집행률 {orgRate.toFixed(1)}%
            </p>
            <p className="text-xs text-toss-gray-600 mt-0.5">
              정상 기준: {config.greenMin}% ~ {config.greenMax}%
              {alertCount > 0 && ` · ⚠ ${alertCount}개 팀 위험`}
            </p>
          </div>
          <StatusBadge status={orgStatus} rate={orgRate} size="sm" />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="총 인원 (평균)" value={`${Math.round(totalHC)}명`} icon={Users} color="#0064FF" />
          <StatCard label="배정 예산" value={formatKRW(totalAllocated)} sub="연간 합계" icon={Wallet} color="#7B61FF" />
          <StatCard label="집행 금액" value={formatKRW(totalActual)} sub="현재까지" icon={TrendingUp} color="#00C896" />
          <StatCard label="주의 팀" value={`${alertCount}개 팀`} sub="위험 신호" icon={AlertTriangle} color="#FF4B4B" />
        </div>

        {/* Chart */}
        <div className="card">
          <h2 className="text-sm font-semibold text-toss-gray-700 mb-4">월별 예산 집행 현황 (만원)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8B95A1' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8B95A1' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(v: number) => [`${v.toLocaleString()}만원`]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="배정예산" fill="#E6ECFF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="집행금액" fill="#0064FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Team table */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-toss-gray-100">
            <h2 className="text-sm font-semibold text-toss-gray-700">팀별 예산 현황</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-toss-gray-100">
                  {['팀명', '인원', '배정 예산', '집행 금액', '집행률', '상태'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-toss-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-toss-gray-100">
                {summaries.map(s => (
                  <tr key={s.team.id}
                    className="hover:bg-toss-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/teams/${s.team.id}`)}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.team.color }} />
                        <span className="font-semibold text-toss-gray-900 text-sm">{s.team.name}</span>
                        {s.team.isDivision && (
                          <span className="text-[10px] font-semibold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full">본부</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-toss-gray-600">
                      {Math.round(s.monthlyData.filter(m => m.headcount > 0).reduce((a, m) => a + m.headcount, 0) /
                        (s.monthlyData.filter(m => m.headcount > 0).length || 1))}명 avg
                    </td>
                    <td className="px-5 py-3.5 text-sm text-toss-gray-700 text-right">{formatKRW(s.totalAllocated)}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-right">{formatKRW(s.totalActual)}</td>
                    <td className="px-5 py-3.5 min-w-[130px]">
                      <ProgressBar rate={s.executionRate} status={s.status} showLabel height={6} />
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-toss-gray-100 bg-toss-gray-50">
                  <td className="px-5 py-3 text-sm font-bold" colSpan={2}>합계</td>
                  <td className="px-5 py-3 text-sm font-semibold text-right">{formatKRW(totalAllocated)}</td>
                  <td className="px-5 py-3 text-sm font-bold text-right">{formatKRW(totalActual)}</td>
                  <td className="px-5 py-3 min-w-[130px]">
                    <ProgressBar rate={orgRate} status={orgStatus} showLabel height={6} />
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={orgStatus} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
