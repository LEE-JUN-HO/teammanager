import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import * as db from '../lib/db'
import Header from '../components/layout/Header'
import { formatKRW, getFiscalMonths } from '../utils/budget'
import StatusBadge from '../components/ui/StatusBadge'
import ProgressBar from '../components/ui/ProgressBar'
import { ChevronRight, Users } from 'lucide-react'
import type { TeamBudgetSummary, TrafficLightConfig, MonthlyBudgetData, FiscalMonth } from '../types'

const STATUS_COLORS: Record<string, string> = { green: '#00C896', yellow: '#FFB800', red: '#FF4B4B' }
const BAR_MAX_H = 60

function MonthlyBarChart({ monthlyData, fiscalMonths }: {
  monthlyData: MonthlyBudgetData[]
  fiscalMonths: FiscalMonth[]
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const hoveredMd = hovered !== null ? monthlyData.find(m => m.month === hovered) : null
  const hoveredFm = hovered !== null ? fiscalMonths.find(fm => fm.month === hovered) : null

  return (
    <div className="flex-1 px-5 py-4 min-w-0">
      {/* 제목 + 호버 정보 — 항상 같은 높이 유지 */}
      <div className="flex items-center justify-between mb-3" style={{ minHeight: 20 }}>
        <p className="text-[11px] font-medium text-toss-gray-500">월별 집행 현황</p>
        {hoveredMd && hoveredFm ? (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="font-semibold text-toss-gray-700">{hoveredFm.shortLabel}</span>
            <span className="text-toss-gray-300">·</span>
            <span className="font-bold text-toss-blue">{formatKRW(hoveredMd.actual)}</span>
            {hoveredMd.actual > 0 && (
              <span className="text-toss-gray-400">({hoveredMd.executionRate.toFixed(1)}%)</span>
            )}
            {hoveredMd.actual === 0 && (
              <span className="text-toss-gray-400">미집행</span>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-toss-gray-300">월에 커서를 올려 확인</span>
        )}
      </div>

      {/* 막대 그래프 */}
      <div className="flex items-end gap-1" style={{ height: BAR_MAX_H }}>
        {fiscalMonths.map((fm) => {
          const md = monthlyData.find(m => m.month === fm.month)
          const rate = md?.executionRate ?? 0
          const barH = md?.actual
            ? Math.max(3, Math.min(BAR_MAX_H, (rate / 120) * BAR_MAX_H))
            : 3
          const color = md?.actual ? STATUS_COLORS[md.status] : '#E6E8EB'
          const isHov = hovered === fm.month

          return (
            <div
              key={fm.month}
              className="flex-1 flex justify-center items-end cursor-default"
              style={{ height: BAR_MAX_H }}
              onMouseEnter={() => setHovered(fm.month)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="rounded-sm transition-all duration-100"
                style={{
                  height: barH,
                  width: isHov ? 7 : 4,
                  backgroundColor: color,
                  opacity: hovered !== null && !isHov ? 0.3 : 1,
                }}
              />
            </div>
          )
        })}
      </div>

      {/* 월 번호 레이블 */}
      <div className="flex gap-1 mt-1">
        {fiscalMonths.map((fm) => (
          <div key={fm.month} className="flex-1 text-center">
            <span className={`text-[8px] transition-colors ${
              hovered === fm.month ? 'text-toss-blue font-bold' : 'text-toss-gray-400'
            }`}>
              {fm.month}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

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

            {/* ── 헤더 ── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: s.team.color + '20' }}>
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

            {/* ── 예산 요약(좌) + 월별 그래프(우) ── */}
            <div className="flex border-t border-toss-gray-100">
              {/* 좌: 3행 예산 요약 */}
              <div className="flex-shrink-0 border-r border-toss-gray-100 px-5 py-4 space-y-3">
                {[
                  { label: '연간 배정', value: formatKRW(s.totalAllocated) },
                  { label: '집행 금액', value: formatKRW(s.totalActual) },
                  { label: '잔여 예산', value: formatKRW(s.totalAllocated - s.totalActual) },
                ].map(k => (
                  <div key={k.label}>
                    <p className="text-[10px] text-toss-gray-500">{k.label}</p>
                    <p className="text-sm font-bold text-toss-gray-900 whitespace-nowrap">{k.value}</p>
                  </div>
                ))}
              </div>

              {/* 우: 월별 집행 현황 그래프 */}
              <MonthlyBarChart monthlyData={s.monthlyData} fiscalMonths={fiscalMonths} />
            </div>

            {/* ── 집행률 진행 바 ── */}
            <div className="px-5 py-3 border-t border-toss-gray-100">
              <ProgressBar rate={s.executionRate} status={s.status} showLabel height={6} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
