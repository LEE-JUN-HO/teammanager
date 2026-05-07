import { useState } from 'react'
import { useAppStore } from '../store'
import Header from '../components/layout/Header'
import { MONTHLY_BUDGET_PER_PERSON, formatKRW } from '../utils/budget'
import { Check, AlertCircle, Plus, Trash2 } from 'lucide-react'
import { StatusDot } from '../components/ui/StatusBadge'

export default function AdminPage() {
  const { trafficLightConfig, updateTrafficLightConfig, teams, addTeam, deleteTeam, currentUser } = useAppStore()
  const [cfg, setCfg] = useState({ ...trafficLightConfig })
  const [saved, setSaved] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: '', color: '#0064FF' })

  const isAdmin = currentUser?.role === 'admin'

  const handleSaveTrafficLight = () => {
    updateTrafficLightConfig(cfg)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const thresholdItems = [
    {
      label: '정상 (녹색)',
      desc: '예산이 계획대로 집행되는 상태',
      color: 'green' as const,
      fields: [
        { key: 'greenMin', label: '최소' },
        { key: 'greenMax', label: '최대' },
      ],
    },
    {
      label: '주의 (노란색)',
      desc: '집행률이 정상 범위를 벗어난 상태',
      color: 'yellow' as const,
      fields: [
        { key: 'yellowLowMin', label: '하한 최소' },
        { key: 'yellowHighMax', label: '상한 최대' },
      ],
    },
  ]

  return (
    <div>
      <Header title="관리자 설정" subtitle="신호등 기준, 팀 관리 등" />
      <div className="p-6 space-y-6">

        {!isAdmin && (
          <div className="flex items-center gap-2 bg-status-yellow-bg text-amber-700 px-4 py-3 rounded-xl text-sm">
            <AlertCircle size={16} />
            관리자 권한이 있는 계정으로 로그인해야 설정을 변경할 수 있어요.
          </div>
        )}

        {/* Traffic light settings */}
        <div className="card">
          <h2 className="font-bold text-toss-gray-900 mb-1">신호등 기준 설정</h2>
          <p className="text-sm text-toss-gray-500 mb-5">
            집행률(%)에 따라 상태 색상을 결정하는 기준값이에요. 나머지 범위는 자동으로 빨간색(위험)이 됩니다.
          </p>

          <div className="space-y-5">
            {thresholdItems.map(item => (
              <div key={item.label} className="bg-toss-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <StatusDot status={item.color} size={10} />
                  <span className="font-semibold text-sm text-toss-gray-800">{item.label}</span>
                  <span className="text-xs text-toss-gray-500">{item.desc}</span>
                </div>
                <div className="flex gap-4">
                  {item.fields.map(f => (
                    <div key={f.key}>
                      <label className="label text-xs">{f.label} (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={200}
                        disabled={!isAdmin}
                        className="input w-24 text-sm"
                        value={cfg[f.key as keyof typeof cfg]}
                        onChange={e => setCfg(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="mt-5 p-4 bg-toss-gray-50 rounded-xl">
            <p className="text-xs font-semibold text-toss-gray-600 mb-3">미리보기</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-2">
                <StatusDot status="red" size={10} />
                <span className="text-toss-gray-600">&lt; {cfg.yellowLowMin}%</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusDot status="yellow" size={10} />
                <span className="text-toss-gray-600">{cfg.yellowLowMin}% ~ {cfg.greenMin - 1}%</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusDot status="green" size={10} />
                <span className="text-toss-gray-600">{cfg.greenMin}% ~ {cfg.greenMax}%</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusDot status="yellow" size={10} />
                <span className="text-toss-gray-600">{cfg.greenMax + 1}% ~ {cfg.yellowHighMax}%</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusDot status="red" size={10} />
                <span className="text-toss-gray-600">&gt; {cfg.yellowHighMax}%</span>
              </div>
            </div>
          </div>

          {isAdmin && (
            <button onClick={handleSaveTrafficLight} className="btn-primary mt-5 flex items-center gap-2">
              {saved ? <><Check size={16} /> 저장됨</> : '기준 저장'}
            </button>
          )}
        </div>

        {/* Budget per person */}
        <div className="card">
          <h2 className="font-bold text-toss-gray-900 mb-1">예산 기준</h2>
          <p className="text-sm text-toss-gray-500 mb-4">인당 월 예산 단가 (현재 고정값)</p>
          <div className="flex items-center gap-4 bg-toss-gray-50 rounded-xl p-4">
            <div>
              <p className="text-xs text-toss-gray-500">인당 월 예산</p>
              <p className="text-lg font-bold text-toss-gray-900">{formatKRW(MONTHLY_BUDGET_PER_PERSON)}</p>
            </div>
            <div className="w-px h-10 bg-toss-gray-200" />
            <div>
              <p className="text-xs text-toss-gray-500">인당 연간 예산</p>
              <p className="text-lg font-bold text-toss-gray-900">{formatKRW(MONTHLY_BUDGET_PER_PERSON * 12)}</p>
            </div>
            <div className="w-px h-10 bg-toss-gray-200" />
            <div>
              <p className="text-xs text-toss-gray-500">예산 기간</p>
              <p className="text-lg font-bold text-toss-gray-900">2월 ~ 익년 1월</p>
            </div>
          </div>
        </div>

        {/* Team management */}
        <div className="card">
          <h2 className="font-bold text-toss-gray-900 mb-1">팀 관리</h2>
          <p className="text-sm text-toss-gray-500 mb-4">팀을 추가하거나 삭제할 수 있어요.</p>

          <div className="space-y-2 mb-4">
            {teams.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-toss-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="text-sm font-semibold text-toss-gray-900">{t.name}</span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => {
                      if (confirm(`"${t.name}"을 삭제할까요?`)) deleteTeam(t.id)
                    }}
                    className="text-toss-gray-400 hover:text-status-red transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {isAdmin && (
            <div className="border border-toss-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-toss-gray-600">새 팀 추가</p>
              <div className="flex gap-3">
                <input
                  className="input flex-1"
                  placeholder="팀 이름"
                  value={newTeam.name}
                  onChange={e => setNewTeam(p => ({ ...p, name: e.target.value }))}
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-toss-gray-500">색상</label>
                  <input
                    type="color"
                    value={newTeam.color}
                    onChange={e => setNewTeam(p => ({ ...p, color: e.target.value }))}
                    className="w-9 h-9 rounded-lg border border-toss-gray-200 cursor-pointer"
                  />
                </div>
                <button
                  disabled={!newTeam.name.trim()}
                  onClick={() => {
                    addTeam({ name: newTeam.name.trim(), managerId: '', color: newTeam.color })
                    setNewTeam({ name: '', color: '#0064FF' })
                  }}
                  className="btn-primary flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Plus size={15} /> 추가
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
