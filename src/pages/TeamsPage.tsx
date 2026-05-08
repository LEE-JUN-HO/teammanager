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
const BAR_MAX_H = 64
const BAR_W = 36
const BAR_W_HOVER = 56

function MonthlyBarChart({ monthlyData, fiscalMonths }: {
  monthlyData: MonthlyBudgetData[]
  fiscalMonths: FiscalMonth[]
}) {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <div className="flex-1 px-5 py-5 min-w-0">
      <p className="text-xs font-semibold text-toss-gray-600 mb-4">월별 집행 현황</p>

      {/* 막대 그래프 — overflow-visible로 툴팁이 카드 위로 올라올 수 있게 */}
      <div className="flex items-end gap-1" style={{ height: BAR_MAX_H }}>
        {fiscalMonths.map((fm) => {
          const md = monthlyData.find(m => m.month === fm.month)
          const rate = md?.executionRate ?? 0
          const barH = md?.actual
            ? Math.max(4, Math.min(BAR_MAX_H, (rate / 120) * BAR_MAX_H))
            : 4
          const color = md?.actual ? STATUS_COLORS[md.status] : '#D1D6DB'
          const isHov = hovered === fm.month

          return (
            <div
              key={fm.month}
              className="relative flex-1 flex justify-center items-end cursor-default"
              style={{ height: BAR_MAX_H }}
              onMouseEnter={() => setHovered(fm.month)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* 툴팁 — 막대 바로 위에 표시 */}
              <div
                className="absolute z-20 pointer-events-none"
                style={{
                  bottom: barH + 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  opacity: isHov ? 1 : 0,
                  transition: 'opacity 0.1s',
                }}
              >
                <div className="bg-toss-gray-800 text-white rounded-lg px-2.5 py-1.5 whitespace-nowrap text-center shadow-lg">
                  <p className="text-xs font-bold">{formatKRW(md?.actual ?? 0)}</p>
                  <p className="text-[11px] text-toss-gray-300 mt-0.5">
                    {md?.actual ? `집행률 ${rate.toFixed(1)}%` : '미집행'}
                  </p>
                </div>
                {/* 말풍선 꼬리 */}
                <div
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{
                    top: '100%',
                    width: 0,
                    height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: '5px solid #1A1F27',
                  }}
                />
              </div>

              {/* 막대 */}
              <div
                className="rounded-sm transition-all duration-100"
                style={{
                  height: barH,
                  width: isHov ? BAR_W_HOVER : BAR_W,
                  backgroundColor: color,
                  opacity: hovered !== null && !isHov ? 0.3 : 1,
                }}
              />
            </div>
          )
        })}
      </div>

      {/* 월 번호 레이블 */}
      <div className="flex gap-1 mt-2">
        {fiscalMonths.map((fm) => (
          <div key={fm.month} className="flex-1 text-center">
            <span className={`text-[11px] font-medium transition-colors ${
              hovered === fm.month
                ? 'text-toss-blue font-bold'
                : 'text-toss-gray-500'
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
          /* overflow-hidden 제거 → 툴팁이 카드 위로 표시되도록 */
          <div key={s.team.id}
            className="card cursor-pointer hover:shadow-card-hover transition-all duration-200 p-0"
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
                      <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">본부</span>
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

              {/* 좌: 3행 예산 요약 — 여백 여유 있게 */}
              <div className="flex-shrink-0 border-r border-toss-gray-100 px-6 py-5 space-y-4">
                {[
                  { label: '연간 배정', value: formatKRW(s.totalAllocated) },
                  { label: '집행 금액', value: formatKRW(s.totalActual) },
                  { label: '잔여 예산', value: formatKRW(s.totalAllocated - s.totalActual) },
                ].map(k => (
                  <div key={k.label}>
                    <p className="text-xs text-toss-gray-500">{k.label}</p>
                    <p className="text-sm font-bold text-toss-gray-900 mt-0.5 whitespace-nowrap">{k.value}</p>
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
