import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import * as db from '../lib/db'
import Header from '../components/layout/Header'
import { formatKRW } from '../utils/budget'
import StatusBadge from '../components/ui/StatusBadge'
import ProgressBar from '../components/ui/ProgressBar'
import { ChevronRight, Lock, Pencil } from 'lucide-react'
import type { TeamBudgetSummary, TrafficLightConfig } from '../types'

export default function ExpensePage() {
  const { selectedFiscalYear } = useAppStore()
  const { profile } = useAuthStore()
  const navigate = useNavigate()

  const [summaries, setSummaries] = useState<TeamBudgetSummary[]>([])
  const [loading, setLoading] = useState(true)

  const canEditTeam = (teamId: string) =>
    profile?.role === 'admin' || (profile?.role === 'manager' && profile.teamId === teamId)

  // profile.role/teamId가 바뀌면(로그인 직후 포함) 재조회해서 필터 재적용
  useEffect(() => { load() }, [selectedFiscalYear, profile?.role, profile?.teamId])

  async function load() {
    setLoading(true)
    try {
      const cfg = await db.getTrafficLightConfig()
      const data = await db.getTeamBudgetSummaries(selectedFiscalYear, cfg)
      const filtered = profile?.role === 'manager'
        ? data.filter(s => s.team.id === profile.teamId)
        : data
      setSummaries(filtered)
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
      <Header title="예산 집행 입력" subtitle="팀을 선택해 집행 항목을 입력하세요" />
      <div className="p-6 space-y-4">
        {summaries.map(s => {
          const editable = canEditTeam(s.team.id)
          return (
            <div key={s.team.id}
              className={`card p-0 overflow-hidden transition-all duration-200 ${editable ? 'cursor-pointer hover:shadow-card-hover' : 'opacity-70'}`}
              onClick={() => editable && navigate(`/expenses/${s.team.id}`)}>

              {/* Header row */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: s.team.color + '20' }}>
                    <span className="text-base font-bold" style={{ color: s.team.color }}>
                      {s.team.name[0]}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-toss-gray-900">{s.team.name}</h3>
                      {s.team.isDivision && (
                        <span className="text-[10px] font-semibold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full">본부</span>
                      )}
                    </div>
                    <p className="text-xs text-toss-gray-500 mt-0.5">
                      배정 {formatKRW(s.totalAllocated)} · 집행 {formatKRW(s.totalActual)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={s.status} rate={s.executionRate} size="sm" />
                  {editable
                    ? <div className="flex items-center gap-1 text-xs text-toss-blue bg-toss-blue-bg px-2.5 py-1 rounded-full">
                        <Pencil size={11} />편집 가능
                      </div>
                    : <div className="flex items-center gap-1 text-xs text-toss-gray-400">
                        <Lock size={11} />조회만
                      </div>
                  }
                  {editable && <ChevronRight size={16} className="text-toss-gray-400" />}
                </div>
              </div>

              {/* Progress */}
              <div className="px-5 pb-4 border-t border-toss-gray-100 pt-3">
                <ProgressBar rate={s.executionRate} status={s.status} showLabel height={6} />
              </div>
            </div>
          )
        })}

        {summaries.length === 0 && (
          <div className="text-center py-16 text-toss-gray-400 text-sm">
            접근 가능한 팀이 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
