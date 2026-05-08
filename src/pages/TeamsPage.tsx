import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import * as db from '../lib/db'
import Header from '../components/layout/Header'
import { formatKRW, getFiscalMonths } from '../utils/budget'
import StatusBadge from '../components/ui/StatusBadge'
import ProgressBar from '../components/ui/ProgressBar'
import { ChevronRight, Users } from 'lucide-react'
import type { TeamBudgetSummary, TrafficLightConfig } from '../types'

export default function TeamsPage() {
  const { selectedFiscalYear } = useAppStore()
  const navigate = useNavigate()
  const [summaries, setSummaries] = useState<TeamBudgetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const fiscalMonths = getFiscalMonths(selectedFiscalYear)

  useEffect(() => { load() }, [selectedFiscalYear])

  async function load() {
    setLoading(true)
    try {
      const cfg: TrafficLightConfig = await db.getTrafficLightConfig()
      const data = await db.getTeamBudgetSummaries(selectedFiscalYear, cfg)
      setSummaries(data)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <Header title="팀별 예산" subtitle="팀을 선택하면 월별 상세를 확인할 수 있어요" />
      <div className="p-6 space-y-4">
        {summaries.map(s => (
          <div key={s.team.id}
            className="card cursor-pointer hover:shadow-card-hover transition-all duration-200 p-0 overflow-hidden"
            onClick={() => navigate(`/teams/${s.team.id}`)}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.team.color + '20' }}>
                  <Users size={18} style={{ color: s.team.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-toss-gray-900">{s.team.name}</h3>
                    {s.team.isDivision && (
                      <span className="text-[10px] font-semibold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full">본부</span>
                    )}
                  </div>
                  <p className="text-xs text-toss-gray-500 mt-0.5">
                    최소 {Math.min(...s.monthlyData.map(m => m.headcount))}명 ~ 최대 {Math.max(...s.monthlyData.map(m => m.headcount))}명
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={s.status} rate={s.executionRate} />
                <ChevronRight size={16} className="text-toss-gray-400" />
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-toss-gray-100 border-t border-toss-gray-100">
              {[
                { label: '연간 배정', value: formatKRW(s.totalAllocated) },
                { label: '집행 금액', value: formatKRW(s.totalActual) },
                { label: '잔여 예산', value: formatKRW(s.totalAllocated - s.totalActual) },
              ].map(k => (
                <div key={k.label} className="px-5 py-3">
                  <p className="text-[11px] text-toss-gray-500">{k.label}</p>
                  <p className="text-sm font-bold text-toss-gray-900">{k.value}</p>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-toss-gray-100">
              <ProgressBar rate={s.executionRate} status={s.status} showLabel height={6} />
            </div>
            <div className="px-5 pb-4 pt-1 border-t border-toss-gray-100">
              <p className="text-[11px] text-toss-gray-500 mb-2">월별 집행 현황</p>
              <div className="flex gap-1 items-end h-10">
                {fiscalMonths.map((fm, i) => {
                  const md = s.monthlyData.find(m => m.month === fm.month)
                  const rate = md?.executionRate ?? 0
                  const barH = md?.actual ? Math.max(4, Math.min(40, (rate / 120) * 40)) : 4
                  const colors = { green: '#00C896', yellow: '#FFB800', red: '#FF4B4B' }
                  const color = md?.actual ? colors[md.status] : '#E6E8EB'
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-sm" style={{ height: barH, backgroundColor: color }}
                        title={`${fm.shortLabel}: ${rate.toFixed(1)}%`} />
                      <span className="text-[9px] text-toss-gray-400 hidden sm:block">{fm.shortLabel}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
