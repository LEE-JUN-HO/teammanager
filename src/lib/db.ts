import { supabase } from './supabase'
import type {
  Team, UserProfile, MonthlyHeadcount, ExpenseItem,
  TrafficLightConfig, TeamBudgetSummary, StatusType,
} from '../types'
import { calcAllocated, calcExecutionRate, getExecutionStatus } from '../utils/budget'

// ─────────────────────────────────────────
// Teams
// ─────────────────────────────────────────
export async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from('teams').select('*').order('name')
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id, name: r.name, color: r.color,
    isDivision: r.is_division ?? false,
    createdAt: r.created_at,
  }))
}

export async function addTeam(team: Pick<Team, 'name' | 'color' | 'isDivision'>): Promise<Team> {
  const { data, error } = await supabase.from('teams').insert({
    name: team.name, color: team.color, is_division: team.isDivision,
  }).select().single()
  if (error) throw error
  return { id: data.id, name: data.name, color: data.color, isDivision: data.is_division ?? false, createdAt: data.created_at }
}

export async function updateTeam(id: string, updates: Pick<Team, 'name' | 'color' | 'isDivision'>): Promise<void> {
  const { error } = await supabase.from('teams').update({
    name: updates.name, color: updates.color, is_division: updates.isDivision,
  }).eq('id', id)
  if (error) throw error
}

export async function deleteTeam(id: string): Promise<void> {
  const { error } = await supabase.from('teams').delete().eq('id', id)
  if (error) throw error
}

// ─────────────────────────────────────────
// Profiles / Users
// ─────────────────────────────────────────
export async function getProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('name')
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id, email: r.email, name: r.name,
    role: r.role as UserProfile['role'],
    teamId: r.team_id ?? null,
    createdAt: r.created_at,
  }))
}

export async function getCurrentProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) return null
  return {
    id: data.id, email: data.email, name: data.name,
    role: data.role as UserProfile['role'],
    teamId: data.team_id ?? null,
    createdAt: data.created_at,
  }
}

export async function approveUser(id: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role: 'viewer' }).eq('id', id).eq('role', 'pending')
  if (error) throw error
}

export async function updateProfile(id: string, updates: { role?: string; teamId?: string | null; name?: string }): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (updates.role !== undefined)   payload.role    = updates.role
  if (updates.name !== undefined)   payload.name    = updates.name
  if ('teamId' in updates)          payload.team_id = updates.teamId
  const { error } = await supabase.from('profiles').update(payload).eq('id', id)
  if (error) throw error
}

// ─────────────────────────────────────────
// Headcounts
// ─────────────────────────────────────────
export async function getHeadcounts(fiscalYear: number): Promise<MonthlyHeadcount[]> {
  const { data, error } = await supabase
    .from('monthly_headcounts').select('*').eq('fiscal_year', fiscalYear)
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id, teamId: r.team_id, fiscalYear: r.fiscal_year,
    month: r.month,
    beginHeadcount: r.begin_headcount ?? 0,
    newHires: r.new_hires ?? 0,
    departures: r.departures ?? 0,
    headcount: r.headcount,
    note: r.note ?? undefined,
  }))
}

export async function upsertHeadcount(
  teamId: string, fiscalYear: number, month: number,
  headcount: number,
  beginHeadcount = 0, newHires = 0, departures = 0,
  note?: string
): Promise<void> {
  const { error } = await supabase.from('monthly_headcounts').upsert({
    team_id: teamId, fiscal_year: fiscalYear, month,
    headcount,
    begin_headcount: beginHeadcount,
    new_hires: newHires,
    departures,
    note: note ?? null,
    updated_by: (await supabase.auth.getUser()).data.user?.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'team_id,fiscal_year,month' })
  if (error) throw error
}

// ─────────────────────────────────────────
// Expense Items
// ─────────────────────────────────────────
export async function getExpenseItems(
  teamId: string, fiscalYear: number, month?: number
): Promise<ExpenseItem[]> {
  let q = supabase.from('expense_items').select('*')
    .eq('team_id', teamId).eq('fiscal_year', fiscalYear)
  if (month !== undefined) q = q.eq('month', month)
  const { data, error } = await q.order('month').order('seq')
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id, teamId: r.team_id, fiscalYear: r.fiscal_year,
    month: r.month, seq: r.seq,
    expenseDate: r.expense_date, userName: r.user_name,
    category: r.category, description: r.description,
    amount: Number(r.amount),
    createdBy: r.created_by ?? null, createdAt: r.created_at,
  }))
}

export async function getNextSeq(teamId: string, fiscalYear: number): Promise<number> {
  const { data } = await supabase.from('expense_items').select('seq')
    .eq('team_id', teamId).eq('fiscal_year', fiscalYear)
    .order('seq', { ascending: false }).limit(1)
  return Number(data?.[0]?.seq ?? 0) + 1
}

export async function addExpenseItem(item: Omit<ExpenseItem, 'id' | 'seq' | 'createdAt' | 'createdBy'>): Promise<ExpenseItem> {
  const userId = (await supabase.auth.getUser()).data.user?.id
  const seq = await getNextSeq(item.teamId, item.fiscalYear)
  const { data, error } = await supabase.from('expense_items').insert({
    team_id: item.teamId, fiscal_year: item.fiscalYear, month: item.month,
    seq, expense_date: item.expenseDate, user_name: item.userName,
    category: item.category, description: item.description,
    amount: item.amount, created_by: userId ?? null,
  }).select().single()
  if (error) throw error
  return {
    id: data.id, teamId: data.team_id, fiscalYear: data.fiscal_year,
    month: data.month, seq: Number(data.seq), expenseDate: data.expense_date,
    userName: data.user_name, category: data.category,
    description: data.description, amount: Number(data.amount),
    createdBy: data.created_by ?? null, createdAt: data.created_at,
  }
}

export async function updateExpenseItem(
  id: string,
  updates: Partial<Pick<ExpenseItem, 'expenseDate' | 'userName' | 'category' | 'description' | 'amount' | 'month'>>
): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (updates.expenseDate)             payload.expense_date = updates.expenseDate
  if (updates.userName)                payload.user_name    = updates.userName
  if (updates.category)                payload.category     = updates.category
  if (updates.description !== undefined) payload.description = updates.description
  if (updates.amount !== undefined)    payload.amount       = updates.amount
  if (updates.month !== undefined)     payload.month        = updates.month
  const { error } = await supabase.from('expense_items').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteExpenseItem(id: string): Promise<void> {
  const { error } = await supabase.from('expense_items').delete().eq('id', id)
  if (error) throw error
}

// ─────────────────────────────────────────
// Traffic Light Config
// ─────────────────────────────────────────
export async function getTrafficLightConfig(): Promise<TrafficLightConfig> {
  const { data, error } = await supabase.from('traffic_light_config').select('*').eq('id', 1).single()
  if (error) return { greenMin: 80, greenMax: 100, yellowLowMin: 60, yellowHighMax: 120, budgetPerPerson: 50_000, divisionBudgetPerPerson: 33_333 }
  return {
    greenMin: data.green_min, greenMax: data.green_max,
    yellowLowMin: data.yellow_low_min, yellowHighMax: data.yellow_high_max,
    budgetPerPerson: data.budget_per_person ?? 50_000,
    divisionBudgetPerPerson: data.division_budget_per_person ?? 33_333,
  }
}

export async function updateTrafficLightConfig(cfg: TrafficLightConfig): Promise<void> {
  const { error } = await supabase.from('traffic_light_config').update({
    green_min: cfg.greenMin, green_max: cfg.greenMax,
    yellow_low_min: cfg.yellowLowMin, yellow_high_max: cfg.yellowHighMax,
    budget_per_person: cfg.budgetPerPerson,
    division_budget_per_person: cfg.divisionBudgetPerPerson,
    updated_at: new Date().toISOString(),
  }).eq('id', 1)
  if (error) throw error
}

// ─────────────────────────────────────────
// Aggregated: Team Budget Summaries
// ─────────────────────────────────────────
export async function getTeamBudgetSummaries(
  fiscalYear: number,
  config: TrafficLightConfig
): Promise<TeamBudgetSummary[]> {
  const [teams, headcounts, expenses] = await Promise.all([
    getTeams(),
    getHeadcounts(fiscalYear),
    supabase.from('expense_items')
      .select('team_id, month, amount')
      .eq('fiscal_year', fiscalYear)
      .then(r => r.data ?? []),
  ])

  // aggregate expense amounts by team+month
  const expMap: Record<string, Record<number, number>> = {}
  for (const e of expenses) {
    expMap[e.team_id] ??= {}
    expMap[e.team_id][e.month] = (expMap[e.team_id][e.month] ?? 0) + Number(e.amount)
  }

  const fiscalOrder = [2,3,4,5,6,7,8,9,10,11,12,1]

  return teams.map(team => {
    const budgetRate = team.isDivision ? config.divisionBudgetPerPerson : config.budgetPerPerson
    const monthlyData = fiscalOrder.map(month => {
      const hc      = headcounts.find(h => h.teamId === team.id && h.month === month)
      const hcount  = hc?.headcount ?? 0
      const alloc   = calcAllocated(hcount, budgetRate)
      const actual  = expMap[team.id]?.[month] ?? 0
      const rate    = calcExecutionRate(actual, alloc)
      const status: StatusType = actual > 0 ? getExecutionStatus(rate, config) : 'green'
      return { month, headcount: hcount, allocated: alloc, actual, executionRate: rate, status }
    })

    const totalAllocated = monthlyData.reduce((s, m) => s + m.allocated, 0)
    const totalActual    = monthlyData.reduce((s, m) => s + m.actual,    0)
    const execRate       = calcExecutionRate(totalActual, totalAllocated)
    const status: StatusType = totalActual > 0 ? getExecutionStatus(execRate, config) : 'green'

    return { team, fiscalYear, totalAllocated, totalActual, executionRate: execRate, status, monthlyData }
  })
}
