import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import * as db from '../lib/db'
import Header from '../components/layout/Header'
import { getFiscalMonths, formatKRWFull, calcAllocated, DEFAULT_CONFIG } from '../utils/budget'
import StatusBadge from '../components/ui/StatusBadge'
import ProgressBar from '../components/ui/ProgressBar'
import { getExecutionStatus, calcExecutionRate } from '../utils/budget'
import { ChevronLeft, Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import type { ExpenseItem, Team, MonthlyHeadcount, TrafficLightConfig } from '../types'

interface NewItemForm {
  expenseDate: string
  userName: string
  category: string
  description: string
  amount: string
}

const EMPTY_FORM: NewItemForm = { expenseDate: '', userName: '', category: '', description: '', amount: '' }

export default function ExpenseTeamPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const { selectedFiscalYear } = useAppStore()
  const { profile } = useAuthStore()

  const [team, setTeam] = useState<Team | null>(null)
  const [items, setItems] = useState<ExpenseItem[]>([])
  const [headcounts, setHeadcounts] = useState<MonthlyHeadcount[]>([])
  const [config, setConfig] = useState<TrafficLightConfig>(DEFAULT_CONFIG)
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewItemForm>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<NewItemForm>>({})
  const [error, setError] = useState('')
  const formRef = useRef<HTMLDivElement>(null)

  const canEdit = profile?.role === 'admin' || (profile?.role === 'manager' && profile?.teamId === teamId)

  const fiscalMonths = getFiscalMonths(selectedFiscalYear)

  useEffect(() => { load() }, [teamId, selectedFiscalYear])

  async function load() {
    if (!teamId) return
    setLoading(true)
    try {
      const [teams, expItems, hcs, cfg] = await Promise.all([
        db.getTeams(),
        db.getExpenseItems(teamId, selectedFiscalYear),
        db.getHeadcounts(selectedFiscalYear),
        db.getTrafficLightConfig(),
      ])
      setTeam(teams.find(t => t.id === teamId) ?? null)
      setItems(expItems)
      setHeadcounts(hcs.filter(h => h.teamId === teamId))
      setConfig(cfg)
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = selectedMonth === 'all'
    ? items
    : items.filter(i => i.month === selectedMonth)

  const budgetRate = team?.isDivision ? config.divisionBudgetPerPerson : config.budgetPerPerson

  // compute month summary
  function monthSummary(month: number) {
    const hc = headcounts.find(h => h.month === month)?.headcount ?? 0
    const allocated = calcAllocated(hc, budgetRate)
    const actual = items.filter(i => i.month === month).reduce((s, i) => s + i.amount, 0)
    const rate = calcExecutionRate(actual, allocated)
    const status = actual > 0 ? getExecutionStatus(rate, config) : 'green' as const
    return { allocated, actual, rate, status, headcount: hc }
  }

  async function handleAdd() {
    if (!teamId) return
    setError('')
    const amount = Number(form.amount.replace(/,/g, ''))
    if (!form.expenseDate || !form.userName || !form.category || isNaN(amount) || amount <= 0) {
      setError('사용날짜, 사용자, 항목, 금액은 필수입니다.'); return
    }
    const month = new Date(form.expenseDate).getMonth() + 1
    // determine fiscal month
    let fiscalMonth = month
    // For fiscal year: Feb(FY) ~ Jan(FY+1). Jan belongs to next calendar year.
    setSaving(true)
    try {
      const newItem = await db.addExpenseItem({
        teamId, fiscalYear: selectedFiscalYear, month: fiscalMonth,
        expenseDate: form.expenseDate, userName: form.userName,
        category: form.category, description: form.description,
        amount,
      })
      setItems(prev => [...prev, newItem].sort((a, b) => a.month - b.month || a.seq - b.seq))
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('이 항목을 삭제할까요?')) return
    await db.deleteExpenseItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function handleSaveEdit(id: string) {
    setSaving(true)
    try {
      const amount = editForm.amount ? Number(editForm.amount.replace(/,/g, '')) : undefined
      const updates = {
        expenseDate: editForm.expenseDate,
        userName: editForm.userName,
        category: editForm.category,
        description: editForm.description,
        ...(amount !== undefined && !isNaN(amount) && { amount }),
      }
      await db.updateExpenseItem(id, updates)
      setItems(prev => prev.map(i =>
        i.id === id
          ? {
              ...i,
              expenseDate: updates.expenseDate ?? i.expenseDate,
              userName: updates.userName ?? i.userName,
              category: updates.category ?? i.category,
              description: updates.description ?? i.description,
              ...(updates.amount !== undefined && { amount: updates.amount }),
            }
          : i
      ))
      setEditingId(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '수정 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!team) return <div className="p-6 text-toss-gray-500">팀을 찾을 수 없어요.</div>

  const totalActual    = filteredItems.reduce((s, i) => s + i.amount, 0)
  const displayedMonth = selectedMonth !== 'all' ? selectedMonth : null
  const mSummary       = displayedMonth ? monthSummary(displayedMonth) : null

  return (
    <div>
      <Header title={team.name} subtitle="예산 집행 항목" />
      <div className="p-6 space-y-5">

        {/* Back */}
        <button onClick={() => navigate('/expenses')} className="btn-ghost flex items-center gap-1 text-sm">
          <ChevronLeft size={16} />목록
        </button>

        {/* Month filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedMonth('all')}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${selectedMonth === 'all' ? 'bg-toss-blue text-white' : 'bg-toss-gray-100 text-toss-gray-600 hover:bg-toss-gray-200'}`}>
            전체
          </button>
          {fiscalMonths.map(fm => (
            <button key={fm.month}
              onClick={() => setSelectedMonth(fm.month)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${selectedMonth === fm.month ? 'bg-toss-blue text-white' : 'bg-toss-gray-100 text-toss-gray-600 hover:bg-toss-gray-200'}`}>
              {fm.shortLabel}
            </button>
          ))}
        </div>

        {/* Month summary bar */}
        {mSummary && (
          <div className="card flex items-center gap-6 py-4">
            <div><p className="text-xs text-toss-gray-500">배정</p><p className="text-base font-bold">{formatKRWFull(mSummary.allocated)}</p></div>
            <div><p className="text-xs text-toss-gray-500">집행</p><p className="text-base font-bold text-toss-blue">{formatKRWFull(mSummary.actual)}</p></div>
            <div><p className="text-xs text-toss-gray-500">잔여</p><p className="text-base font-bold">{formatKRWFull(mSummary.allocated - mSummary.actual)}</p></div>
            <div className="flex-1">
              <ProgressBar rate={mSummary.rate} status={mSummary.status} showLabel height={6} />
            </div>
            <StatusBadge status={mSummary.status} />
          </div>
        )}

        {/* Expense table */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-toss-gray-100">
            <h2 className="text-sm font-semibold text-toss-gray-700">
              집행 항목 ({filteredItems.length}건 · {formatKRWFull(totalActual)})
            </h2>
            {canEdit && (
              <button onClick={() => { setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100) }}
                className="btn-primary flex items-center gap-1.5 text-sm py-2 px-4">
                <Plus size={15} />항목 추가
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-toss-gray-100 bg-toss-gray-50">
                  {['SEQ','월','사용날짜','사용자','항목','내용','금액',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-toss-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-toss-gray-100">
                {filteredItems.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-toss-gray-400">집행 항목이 없습니다.</td></tr>
                )}
                {filteredItems.map(item => {
                  const fm = fiscalMonths.find(m => m.month === item.month)
                  const isEditing = editingId === item.id
                  return (
                    <tr key={item.id} className="hover:bg-toss-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-toss-gray-500 font-mono">{item.seq}</td>
                      <td className="px-4 py-3 text-sm text-toss-gray-600">{fm?.shortLabel ?? item.month + '월'}</td>

                      {isEditing ? (
                        <>
                          <td className="px-2 py-2"><input type="date" className="input text-sm py-1.5 w-36"
                            value={editForm.expenseDate ?? ''}
                            onChange={e => setEditForm(p => ({ ...p, expenseDate: e.target.value }))} /></td>
                          <td className="px-2 py-2"><input className="input text-sm py-1.5 w-24"
                            value={editForm.userName ?? ''}
                            onChange={e => setEditForm(p => ({ ...p, userName: e.target.value }))} /></td>
                          <td className="px-2 py-2"><input className="input text-sm py-1.5 w-24"
                            value={editForm.category ?? ''}
                            onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} /></td>
                          <td className="px-2 py-2"><input className="input text-sm py-1.5 w-36"
                            value={editForm.description ?? ''}
                            onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></td>
                          <td className="px-2 py-2"><input className="input text-sm py-1.5 w-28"
                            value={editForm.amount ?? ''}
                            onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))} /></td>
                          <td className="px-2 py-2">
                            <div className="flex gap-1">
                              <button onClick={() => handleSaveEdit(item.id)} disabled={saving}
                                className="p-1.5 rounded-lg bg-toss-blue text-white hover:bg-toss-blue-dark">
                                <Check size={14} />
                              </button>
                              <button onClick={() => setEditingId(null)}
                                className="p-1.5 rounded-lg bg-toss-gray-100 text-toss-gray-600">
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-sm">{item.expenseDate}</td>
                          <td className="px-4 py-3 text-sm">{item.userName}</td>
                          <td className="px-4 py-3 text-sm font-medium">{item.category}</td>
                          <td className="px-4 py-3 text-sm text-toss-gray-600">{item.description}</td>
                          <td className="px-4 py-3 text-sm font-bold text-right">{item.amount.toLocaleString()}원</td>
                          <td className="px-4 py-3">
                            {canEdit && (
                              <div className="flex gap-1">
                                <button onClick={() => {
                                  setEditingId(item.id)
                                  setEditForm({
                                    expenseDate: item.expenseDate,
                                    userName: item.userName,
                                    category: item.category,
                                    description: item.description ?? '',
                                    amount: item.amount.toLocaleString(),
                                  })
                                }}
                                  className="p-1.5 rounded-lg hover:bg-toss-gray-100 text-toss-gray-500">
                                  <Edit2 size={13} />
                                </button>
                                <button onClick={() => handleDelete(item.id)}
                                  className="p-1.5 rounded-lg hover:bg-status-red-bg text-toss-gray-400 hover:text-status-red">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
              {filteredItems.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-toss-gray-100 bg-toss-gray-50">
                    <td className="px-4 py-3 text-sm font-bold" colSpan={6}>소계</td>
                    <td className="px-4 py-3 text-sm font-bold text-right text-toss-blue">
                      {totalActual.toLocaleString()}원
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Add form */}
        {canEdit && showForm && (
          <div ref={formRef} className="card border-2 border-toss-blue">
            <h3 className="font-bold text-toss-gray-900 mb-4 flex items-center gap-2">
              <Plus size={18} className="text-toss-blue" />새 항목 추가
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="label">사용날짜 *</label>
                <input type="date" className="input"
                  value={form.expenseDate}
                  onChange={e => setForm(p => ({ ...p, expenseDate: e.target.value }))} />
              </div>
              <div>
                <label className="label">사용자 *</label>
                <input className="input" placeholder="홍길동"
                  value={form.userName}
                  onChange={e => setForm(p => ({ ...p, userName: e.target.value }))} />
              </div>
              <div>
                <label className="label">항목 *</label>
                <input className="input" placeholder="팀회식, 교육비 등"
                  value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className="label">내용</label>
                <input className="input" placeholder="구체적인 사용 내용"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">금액 (원) *</label>
                <input className="input" placeholder="150000"
                  value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
              </div>
            </div>

            {error && (
              <p className="text-sm text-status-red bg-status-red-bg px-3 py-2 rounded-xl mb-3">{error}</p>
            )}

            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={saving}
                className="btn-primary flex items-center gap-2">
                {saving
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Check size={15} />}
                저장
              </button>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError('') }}
                className="btn-secondary">취소</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
