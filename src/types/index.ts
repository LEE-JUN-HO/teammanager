export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'viewer'
  teamId?: string
}

export interface Team {
  id: string
  name: string
  managerId: string
  color: string
}

export interface MonthlyHeadcount {
  teamId: string
  fiscalYear: number  // e.g. 2025 means Feb 2025 ~ Jan 2026
  month: number       // 2~12 = Feb~Dec of fiscalYear, 1 = Jan of fiscalYear+1
  headcount: number
  note?: string
}

export interface BudgetEntry {
  id: string
  teamId: string
  fiscalYear: number
  month: number
  allocatedAmount: number   // headcount × 50,000
  actualAmount: number
  description?: string
}

export interface TrafficLightConfig {
  greenMin: number    // default 80
  greenMax: number    // default 100
  yellowLowMin: number  // default 60
  yellowHighMax: number // default 120
}

export type StatusType = 'green' | 'yellow' | 'red'

export interface TeamBudgetSummary {
  team: Team
  fiscalYear: number
  totalAllocated: number
  totalActual: number
  executionRate: number
  status: StatusType
  monthlyData: MonthlyBudgetData[]
}

export interface MonthlyBudgetData {
  month: number
  headcount: number
  allocated: number
  actual: number
  executionRate: number
  status: StatusType
}

export interface FiscalMonth {
  year: number
  month: number
  label: string
  shortLabel: string
}
