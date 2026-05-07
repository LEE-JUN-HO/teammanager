export interface UserProfile {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'viewer'
  teamId: string | null
  createdAt: string
}

export interface Team {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface MonthlyHeadcount {
  id?: string
  teamId: string
  fiscalYear: number
  month: number
  beginHeadcount: number  // 기초인원
  newHires: number        // 입사자
  departures: number      // 퇴사자
  headcount: number       // 기말인원 (= 기초 + 입사 - 퇴사)
  note?: string
}

export interface ExpenseItem {
  id: string
  teamId: string
  fiscalYear: number
  month: number
  seq: number
  expenseDate: string     // YYYY-MM-DD
  userName: string
  category: string        // 항목
  description: string     // 내용
  amount: number
  createdBy: string | null
  createdAt: string
}

export interface TrafficLightConfig {
  greenMin: number
  greenMax: number
  yellowLowMin: number
  yellowHighMax: number
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
