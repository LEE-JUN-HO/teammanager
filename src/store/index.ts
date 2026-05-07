import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Team, MonthlyHeadcount, BudgetEntry, TrafficLightConfig, TeamBudgetSummary, StatusType } from '../types'
import {
  MOCK_TEAMS, MOCK_HEADCOUNTS, MOCK_BUDGET_ENTRIES,
  DEFAULT_TRAFFIC_LIGHT_CONFIG, MOCK_USERS,
} from '../data/mockData'
import { calcAllocated, calcExecutionRate, getExecutionStatus } from '../utils/budget'

interface AppState {
  currentUser: User | null
  teams: Team[]
  headcounts: MonthlyHeadcount[]
  budgetEntries: BudgetEntry[]
  trafficLightConfig: TrafficLightConfig
  selectedFiscalYear: number

  // auth
  login: (email: string, password: string) => boolean
  logout: () => void

  // data mutations
  updateHeadcount: (teamId: string, fiscalYear: number, month: number, headcount: number, note?: string) => void
  updateActualAmount: (teamId: string, fiscalYear: number, month: number, amount: number, description?: string) => void
  updateTrafficLightConfig: (config: TrafficLightConfig) => void
  addTeam: (team: Omit<Team, 'id'>) => void
  updateTeam: (id: string, updates: Partial<Team>) => void
  deleteTeam: (id: string) => void
  setSelectedFiscalYear: (year: number) => void

  // computed
  getTeamSummary: (teamId: string, fiscalYear: number) => TeamBudgetSummary | null
  getAllTeamSummaries: (fiscalYear: number) => TeamBudgetSummary[]
  getOrgStatus: (fiscalYear: number) => StatusType
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      teams: MOCK_TEAMS,
      headcounts: MOCK_HEADCOUNTS,
      budgetEntries: MOCK_BUDGET_ENTRIES,
      trafficLightConfig: DEFAULT_TRAFFIC_LIGHT_CONFIG,
      selectedFiscalYear: 2025,

      login: (email, _password) => {
        const user = MOCK_USERS.find(u => u.email === email)
        if (user) {
          set({ currentUser: user })
          return true
        }
        return false
      },

      logout: () => set({ currentUser: null }),

      updateHeadcount: (teamId, fiscalYear, month, headcount, note) => {
        set(state => {
          const idx = state.headcounts.findIndex(
            h => h.teamId === teamId && h.fiscalYear === fiscalYear && h.month === month
          )
          const updated = [...state.headcounts]
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], headcount, note }
          } else {
            updated.push({ teamId, fiscalYear, month, headcount, note })
          }

          // sync allocated amount in budgetEntries
          const entries = [...state.budgetEntries]
          const eIdx = entries.findIndex(
            e => e.teamId === teamId && e.fiscalYear === fiscalYear && e.month === month
          )
          const allocated = calcAllocated(headcount)
          if (eIdx >= 0) {
            entries[eIdx] = { ...entries[eIdx], allocatedAmount: allocated }
          } else {
            entries.push({
              id: `be_${Date.now()}`,
              teamId, fiscalYear, month,
              allocatedAmount: allocated,
              actualAmount: 0,
            })
          }
          return { headcounts: updated, budgetEntries: entries }
        })
      },

      updateActualAmount: (teamId, fiscalYear, month, amount, description) => {
        set(state => {
          const entries = [...state.budgetEntries]
          const idx = entries.findIndex(
            e => e.teamId === teamId && e.fiscalYear === fiscalYear && e.month === month
          )
          if (idx >= 0) {
            entries[idx] = { ...entries[idx], actualAmount: amount, description }
          } else {
            const hc = state.headcounts.find(
              h => h.teamId === teamId && h.fiscalYear === fiscalYear && h.month === month
            )
            entries.push({
              id: `be_${Date.now()}`,
              teamId, fiscalYear, month,
              allocatedAmount: calcAllocated(hc?.headcount ?? 0),
              actualAmount: amount,
              description,
            })
          }
          return { budgetEntries: entries }
        })
      },

      updateTrafficLightConfig: (config) => set({ trafficLightConfig: config }),

      addTeam: (team) => {
        set(state => ({
          teams: [...state.teams, { ...team, id: `t_${Date.now()}` }],
        }))
      },

      updateTeam: (id, updates) => {
        set(state => ({
          teams: state.teams.map(t => t.id === id ? { ...t, ...updates } : t),
        }))
      },

      deleteTeam: (id) => {
        set(state => ({
          teams: state.teams.filter(t => t.id !== id),
        }))
      },

      setSelectedFiscalYear: (year) => set({ selectedFiscalYear: year }),

      getTeamSummary: (teamId, fiscalYear) => {
        const { teams, headcounts, budgetEntries, trafficLightConfig } = get()
        const team = teams.find(t => t.id === teamId)
        if (!team) return null

        const fiscalMonthOrder = [2,3,4,5,6,7,8,9,10,11,12,1]
        const monthlyData = fiscalMonthOrder.map(month => {
          const hc = headcounts.find(h => h.teamId === teamId && h.fiscalYear === fiscalYear && h.month === month)
          const entry = budgetEntries.find(e => e.teamId === teamId && e.fiscalYear === fiscalYear && e.month === month)
          const headcount = hc?.headcount ?? 0
          const allocated = entry?.allocatedAmount ?? calcAllocated(headcount)
          const actual = entry?.actualAmount ?? 0
          const executionRate = calcExecutionRate(actual, allocated)
          return {
            month,
            headcount,
            allocated,
            actual,
            executionRate,
            status: actual > 0 ? getExecutionStatus(executionRate, trafficLightConfig) : 'green' as const,
          }
        })

        const totalAllocated = monthlyData.reduce((s, m) => s + m.allocated, 0)
        const totalActual = monthlyData.reduce((s, m) => s + m.actual, 0)
        const executionRate = calcExecutionRate(totalActual, totalAllocated)

        return {
          team,
          fiscalYear,
          totalAllocated,
          totalActual,
          executionRate,
          status: totalActual > 0 ? getExecutionStatus(executionRate, trafficLightConfig) : 'green',
          monthlyData,
        }
      },

      getAllTeamSummaries: (fiscalYear) => {
        const { teams, getTeamSummary } = get()
        return teams
          .map(t => getTeamSummary(t.id, fiscalYear))
          .filter((s): s is TeamBudgetSummary => s !== null)
      },

      getOrgStatus: (fiscalYear) => {
        const summaries = get().getAllTeamSummaries(fiscalYear)
        if (summaries.some(s => s.status === 'red')) return 'red'
        if (summaries.some(s => s.status === 'yellow')) return 'yellow'
        return 'green'
      },
    }),
    {
      name: 'teammanager-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        teams: state.teams,
        headcounts: state.headcounts,
        budgetEntries: state.budgetEntries,
        trafficLightConfig: state.trafficLightConfig,
        selectedFiscalYear: state.selectedFiscalYear,
      }),
    }
  )
)
