import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useAppStore } from '../store/appStore'
import * as db from '../lib/db'
import Header from '../components/layout/Header'
import { MONTHLY_BUDGET_PER_PERSON, formatKRW, getFiscalMonths, DEFAULT_CONFIG } from '../utils/budget'
import { Check, AlertCircle, Plus, Trash2, Save } from 'lucide-react'
import { StatusDot } from '../components/ui/StatusBadge'
import type { TrafficLightConfig, UserProfile, Team, MonthlyHeadcount } from '../types'

// ─── Budget Config ────────────────────────────────────────
function BudgetConfigSection({ isAdmin }: { isAdmin: boolean }) {
  const [budgetPerPerson, setBudgetPerPerson] = useState(MONTHLY_BUDGET_PER_PERSON)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    db.getTrafficLightConfig().then(cfg => {
      setBudgetPerPerson(cfg.budgetPerPerson)
      setLoading(false)
    })
  }, [])

  const save = async () => {
    const cfg = await db.getTrafficLightConfig()
    await db.updateTrafficLightConfig({ ...cfg, budgetPerPerson })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="card animate-pulse h-32" />

  return (
    <div className="card">
      <h2 className="font-bold text-toss-gray-900 mb-1">예산 기준</h2>
      <p className="text-sm text-toss-gray-500 mb-5">인당 월 예산 기준금액을 설정합니다. 변경 시 모든 팀의 배정 예산이 즉시 재계산됩니다.</p>
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <label className="label">인당 월 예산 (원)</label>
          {isAdmin ? (
            <input type="number" min={0} step={1000} className="input w-40 text-sm"
              value={budgetPerPerson}
              onChange={e => setBudgetPerPerson(Number(e.target.value))} />
          ) : (
            <p className="text-xl font-bold text-toss-gray-900">{formatKRW(budgetPerPerson)}</p>
          )}
        </div>
        <div className="bg-toss-gray-50 rounded-xl px-4 py-3">
          <p className="text-xs text-toss-gray-500">인당 연간 예산</p>
          <p className="text-lg font-bold text-toss-gray-900">{formatKRW(budgetPerPerson * 12)}</p>
        </div>
        <div className="bg-toss-gray-50 rounded-xl px-4 py-3">
          <p className="text-xs text-toss-gray-500">회계 기간</p>
          <p className="text-lg font-bold text-toss-gray-900">2월 ~ 익년 1월</p>
        </div>
      </div>
      {isAdmin && (
        <button onClick={save} className="btn-primary mt-5 flex items-center gap-2">
          {saved ? <><Check size={16} />저장됨</> : <><Save size={16} />저장</>}
        </button>
      )}
    </div>
  )
}

// ─── Traffic Light Settings ────────────────────────────────
function TrafficLightSection({ isAdmin }: { isAdmin: boolean }) {
  const [cfg, setCfg] = useState<TrafficLightConfig>(DEFAULT_CONFIG)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    db.getTrafficLightConfig().then(c => { setCfg(c); setLoading(false) })
  }, [])

  const save = async () => {
    await db.updateTrafficLightConfig(cfg)
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="card animate-pulse h-48" />

  return (
    <div className="card">
      <h2 className="font-bold text-toss-gray-900 mb-1">신호등 기준 설정</h2>
      <p className="text-sm text-toss-gray-500 mb-5">집행률(%)에 따른 상태 색상 기준값이에요.</p>
      <div className="space-y-4">
        {[
          { label: '정상 (녹색)', color: 'green' as const, desc: '계획대로 집행 중',
            fields: [{ key: 'greenMin', label: '최소' }, { key: 'greenMax', label: '최대' }] },
          { label: '주의 (노란색)', color: 'yellow' as const, desc: '정상 범위를 벗어남',
            fields: [{ key: 'yellowLowMin', label: '하한 최소' }, { key: 'yellowHighMax', label: '상한 최대' }] },
        ].map(item => (
          <div key={item.label} className="bg-toss-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <StatusDot status={item.color} size={10} />
              <span className="font-semibold text-sm">{item.label}</span>
              <span className="text-xs text-toss-gray-500">{item.desc}</span>
            </div>
            <div className="flex gap-4">
              {item.fields.map(f => (
                <div key={f.key}>
                  <label className="label text-xs">{f.label} (%)</label>
                  <input type="number" min={0} max={200} disabled={!isAdmin} className="input w-24 text-sm"
                    value={cfg[f.key as keyof TrafficLightConfig]}
                    onChange={e => setCfg(p => ({ ...p, [f.key]: Number(e.target.value) }))} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 flex-wrap text-sm text-toss-gray-600 bg-toss-gray-50 rounded-xl p-3">
        {[
          { s: 'red', label: `< ${cfg.yellowLowMin}%` },
          { s: 'yellow', label: `${cfg.yellowLowMin}–${cfg.greenMin - 1}%` },
          { s: 'green', label: `${cfg.greenMin}–${cfg.greenMax}%` },
          { s: 'yellow', label: `${cfg.greenMax + 1}–${cfg.yellowHighMax}%` },
          { s: 'red', label: `> ${cfg.yellowHighMax}%` },
        ].map((x, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <StatusDot status={x.s as 'red' | 'yellow' | 'green'} size={10} />
            <span>{x.label}</span>
          </div>
        ))}
      </div>
      {isAdmin && (
        <button onClick={save} className="btn-primary mt-5 flex items-center gap-2">
          {saved ? <><Check size={16} />저장됨</> : <><Save size={16} />기준 저장</>}
        </button>
      )}
    </div>
  )
}

// ─── User Management ──────────────────────────────────────
function UserManagementSection({ isAdmin, teams }: { isAdmin: boolean; teams: Team[] }) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, { role: string; teamId: string | null }>>({})

  useEffect(() => {
    db.getProfiles().then(u => { setUsers(u); setLoading(false) })
  }, [])

  const getEdit = (u: UserProfile) => edits[u.id] ?? { role: u.role, teamId: u.teamId }

  const handleSave = async (u: UserProfile) => {
    const e = getEdit(u)
    setSaving(u.id)
    await db.updateProfile(u.id, {
      role: e.role,
      teamId: e.role === 'manager' ? e.teamId : null,
    })
    setUsers(prev => prev.map(p => p.id === u.id
      ? { ...p, role: e.role as UserProfile['role'], teamId: e.role === 'manager' ? e.teamId : null }
      : p))
    setSaving(null)
  }

  if (loading) return <div className="card animate-pulse h-48" />

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-toss-gray-100">
        <h2 className="font-bold text-toss-gray-900">회원 관리</h2>
        <p className="text-sm text-toss-gray-500 mt-0.5">가입 회원의 역할과 담당 팀을 설정하세요</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-toss-gray-100 bg-toss-gray-50">
              {['이름', '이메일', '역할', '담당 팀', ''].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-toss-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-toss-gray-100">
            {users.map(u => {
              const e = getEdit(u)
              const changed = e.role !== u.role || e.teamId !== u.teamId
              return (
                <tr key={u.id} className="hover:bg-toss-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-toss-blue flex items-center justify-center text-white text-xs font-bold">
                        {u.name[0]}
                      </div>
                      <span className="text-sm font-semibold">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-toss-gray-600">{u.email}</td>
                  <td className="px-5 py-3">
                    {isAdmin ? (
                      <select className="input text-sm py-1.5 w-28"
                        value={e.role}
                        onChange={ev => setEdits(p => ({ ...p, [u.id]: { ...e, role: ev.target.value } }))}>
                        <option value="viewer">viewer</option>
                        <option value="manager">manager</option>
                        <option value="admin">admin</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                        u.role === 'admin' ? 'bg-toss-blue-bg text-toss-blue' :
                        u.role === 'manager' ? 'bg-purple-100 text-purple-700' :
                        'bg-toss-gray-100 text-toss-gray-600'}`}>
                        {u.role}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {isAdmin && e.role === 'manager' ? (
                      <select className="input text-sm py-1.5 w-36"
                        value={e.teamId ?? ''}
                        onChange={ev => setEdits(p => ({ ...p, [u.id]: { ...e, teamId: ev.target.value || null } }))}>
                        <option value="">팀 미배정</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-sm text-toss-gray-600">
                        {u.teamId ? teams.find(t => t.id === u.teamId)?.name ?? '-' : '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {isAdmin && changed && (
                      <button onClick={() => handleSave(u)} disabled={saving === u.id}
                        className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                        {saving === u.id
                          ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <Save size={12} />}
                        저장
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Headcount Management ─────────────────────────────────
interface HcRow { beginHeadcount: number; newHires: number; departures: number }

function HeadcountManagementSection({ teams }: { teams: Team[] }) {
  const { selectedFiscalYear } = useAppStore()
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [headcounts, setHeadcounts] = useState<MonthlyHeadcount[]>([])
  const [edits, setEdits] = useState<Record<number, HcRow>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [saved, setSaved] = useState<number | null>(null)
  const [budgetPerPerson, setBudgetPerPerson] = useState(MONTHLY_BUDGET_PER_PERSON)
  const fiscalMonths = getFiscalMonths(selectedFiscalYear)

  useEffect(() => {
    db.getTrafficLightConfig().then(cfg => setBudgetPerPerson(cfg.budgetPerPerson))
  }, [])

  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) setSelectedTeamId(teams[0].id)
  }, [teams])

  useEffect(() => {
    if (!selectedTeamId) return
    db.getHeadcounts(selectedFiscalYear).then(all => {
      setHeadcounts(all.filter(h => h.teamId === selectedTeamId))
      setEdits({})
    })
  }, [selectedTeamId, selectedFiscalYear])

  function getRow(month: number): HcRow {
    if (edits[month]) return edits[month]
    const hc = headcounts.find(h => h.month === month)
    return { beginHeadcount: hc?.beginHeadcount ?? 0, newHires: hc?.newHires ?? 0, departures: hc?.departures ?? 0 }
  }

  function calcEnd(row: HcRow) { return Math.max(0, row.beginHeadcount + row.newHires - row.departures) }

  function setField(month: number, field: keyof HcRow, value: number) {
    setEdits(prev => ({ ...prev, [month]: { ...getRow(month), [field]: Math.max(0, value) } }))
  }

  function isChanged(month: number) {
    const hc = headcounts.find(h => h.month === month)
    const row = edits[month]
    if (!row) return false
    return row.beginHeadcount !== (hc?.beginHeadcount ?? 0) ||
           row.newHires !== (hc?.newHires ?? 0) ||
           row.departures !== (hc?.departures ?? 0)
  }

  async function handleSave(month: number) {
    if (!selectedTeamId) return
    const row = getRow(month)
    const endHc = calcEnd(row)
    setSaving(month)
    try {
      await db.upsertHeadcount(selectedTeamId, selectedFiscalYear, month, endHc,
        row.beginHeadcount, row.newHires, row.departures)
      setHeadcounts(prev => {
        const next = prev.filter(h => h.month !== month)
        return [...next, { teamId: selectedTeamId, fiscalYear: selectedFiscalYear, month,
          beginHeadcount: row.beginHeadcount, newHires: row.newHires, departures: row.departures,
          headcount: endHc }]
      })
      setEdits(prev => { const n = { ...prev }; delete n[month]; return n })
      setSaved(month)
      setTimeout(() => setSaved(null), 1500)
    } finally {
      setSaving(null)
    }
  }

  const totalEnd = fiscalMonths.reduce((s, fm) => s + calcEnd(getRow(fm.month)), 0)
  const totalBudget = fiscalMonths.reduce((s, fm) => s + calcEnd(getRow(fm.month)) * budgetPerPerson, 0)

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-toss-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-toss-gray-900">월별 인원 관리</h2>
          <p className="text-sm text-toss-gray-500 mt-0.5">기초인원 · 입사자 · 퇴사자를 입력하면 기말인원과 배정예산이 자동 계산됩니다</p>
        </div>
        <select className="input w-40 text-sm"
          value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)}>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-toss-gray-100 bg-toss-gray-50">
              {['월', '기초인원', '입사자', '퇴사자', '기말인원', '배정예산', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-toss-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-toss-gray-100">
            {fiscalMonths.map(fm => {
              const row = getRow(fm.month)
              const endHc = calcEnd(row)
              const budget = endHc * budgetPerPerson
              const changed = isChanged(fm.month)
              const isSaving = saving === fm.month
              const isSaved  = saved  === fm.month

              const inputCls = "input w-20 py-1.5 text-sm text-center"
              return (
                <tr key={fm.month} className="hover:bg-toss-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-toss-gray-700 whitespace-nowrap">{fm.shortLabel}</td>
                  <td className="px-3 py-2">
                    <input type="number" min={0} className={inputCls} value={row.beginHeadcount}
                      onChange={e => setField(fm.month, 'beginHeadcount', Number(e.target.value))} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min={0} className={inputCls} value={row.newHires}
                      onChange={e => setField(fm.month, 'newHires', Number(e.target.value))} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min={0} className={inputCls} value={row.departures}
                      onChange={e => setField(fm.month, 'departures', Number(e.target.value))} />
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-toss-blue">{endHc}명</td>
                  <td className="px-4 py-3 text-sm text-toss-gray-600">{formatKRW(budget)}</td>
                  <td className="px-4 py-3">
                    {isSaved ? (
                      <span className="flex items-center gap-1 text-xs text-status-green font-semibold"><Check size={13} />저장됨</span>
                    ) : (
                      <button onClick={() => handleSave(fm.month)}
                        disabled={!changed || isSaving}
                        className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                          changed ? 'bg-toss-blue text-white hover:bg-toss-blue-dark' : 'bg-toss-gray-100 text-toss-gray-400 cursor-default'}`}>
                        {isSaving
                          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <Save size={12} />}
                        저장
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-toss-gray-200 bg-toss-gray-50">
              <td className="px-4 py-3 text-sm font-bold" colSpan={4}>연간 합계</td>
              <td className="px-4 py-3 text-sm font-bold text-toss-blue">{totalEnd}명</td>
              <td className="px-4 py-3 text-sm font-bold text-toss-gray-900">{formatKRW(totalBudget)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Team Management ──────────────────────────────────────
function TeamManagementSection({ isAdmin, teams, setTeams }: {
  isAdmin: boolean; teams: Team[]; setTeams: (t: Team[]) => void
}) {
  const [newTeam, setNewTeam] = useState({ name: '', color: '#0064FF' })
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!newTeam.name.trim()) return
    setSaving(true)
    const t = await db.addTeam({ name: newTeam.name.trim(), color: newTeam.color })
    setTeams([...teams, t])
    setNewTeam({ name: '', color: '#0064FF' })
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}"을 삭제할까요? 관련 예산 데이터도 모두 삭제됩니다.`)) return
    await db.deleteTeam(id)
    setTeams(teams.filter(t => t.id !== id))
  }

  return (
    <div className="card">
      <h2 className="font-bold text-toss-gray-900 mb-1">팀 관리</h2>
      <p className="text-sm text-toss-gray-500 mb-4">팀을 추가하거나 삭제할 수 있어요.</p>
      <div className="space-y-2 mb-4">
        {teams.map(t => (
          <div key={t.id} className="flex items-center justify-between bg-toss-gray-50 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="text-sm font-semibold">{t.name}</span>
            </div>
            {isAdmin && (
              <button onClick={() => handleDelete(t.id, t.name)}
                className="text-toss-gray-400 hover:text-status-red transition-colors">
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
            <input className="input flex-1" placeholder="팀 이름"
              value={newTeam.name} onChange={e => setNewTeam(p => ({ ...p, name: e.target.value }))} />
            <div className="flex items-center gap-2">
              <label className="text-xs text-toss-gray-500">색상</label>
              <input type="color" value={newTeam.color}
                onChange={e => setNewTeam(p => ({ ...p, color: e.target.value }))}
                className="w-9 h-9 rounded-lg border border-toss-gray-200 cursor-pointer" />
            </div>
            <button disabled={!newTeam.name.trim() || saving} onClick={handleAdd}
              className="btn-primary flex items-center gap-1.5 whitespace-nowrap">
              <Plus size={15} />추가
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Admin Page ──────────────────────────────────────
export default function AdminPage() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [teams, setTeams] = useState<Team[]>([])
  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    if (profile && profile.role !== 'admin') navigate('/dashboard', { replace: true })
  }, [profile])

  useEffect(() => { db.getTeams().then(setTeams) }, [])

  return (
    <div>
      <Header title="관리자 설정" subtitle="신호등 기준, 회원 관리, 팀 관리" />
      <div className="p-6 space-y-6">
        {!isAdmin && (
          <div className="flex items-center gap-2 bg-status-yellow-bg text-amber-700 px-4 py-3 rounded-xl text-sm">
            <AlertCircle size={16} />관리자 권한이 있는 계정으로 로그인해야 설정을 변경할 수 있어요.
          </div>
        )}

        <BudgetConfigSection isAdmin={isAdmin} />

        <HeadcountManagementSection teams={teams} />
        <TrafficLightSection isAdmin={isAdmin} />
        <UserManagementSection isAdmin={isAdmin} teams={teams} />
        <TeamManagementSection isAdmin={isAdmin} teams={teams} setTeams={setTeams} />
      </div>
    </div>
  )
}
