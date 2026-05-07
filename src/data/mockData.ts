import type { Team, MonthlyHeadcount, BudgetEntry, TrafficLightConfig, User } from '../types'
import { calcAllocated } from '../utils/budget'

export const MOCK_USERS: User[] = [
  { id: 'u1', email: 'admin@bigxdata.io', name: '이준호', role: 'admin' },
  { id: 'u2', email: 'dev@bigxdata.io', name: '김개발', role: 'manager', teamId: 't1' },
  { id: 'u3', email: 'mkt@bigxdata.io', name: '박마케팅', role: 'manager', teamId: 't2' },
  { id: 'u4', email: 'viewer@bigxdata.io', name: '최조회', role: 'viewer' },
]

export const MOCK_TEAMS: Team[] = [
  { id: 't1', name: '개발팀', managerId: 'u2', color: '#0064FF' },
  { id: 't2', name: '마케팅팀', managerId: 'u3', color: '#7B61FF' },
  { id: 't3', name: '데이터팀', managerId: 'u1', color: '#00C896' },
  { id: 't4', name: '영업팀', managerId: 'u1', color: '#FF6B35' },
  { id: 't5', name: '경영지원팀', managerId: 'u1', color: '#FFB800' },
]

// 2025 fiscal year: Feb 2025 ~ Jan 2026
const FY = 2025

// headcount per team per month (month: 2=Feb ... 12=Dec, 1=Jan next year)
const headcounts: Array<[string, number, number]> = [
  // [teamId, month, headcount]
  // 개발팀
  ['t1',2,8],['t1',3,8],['t1',4,9],['t1',5,9],['t1',6,9],
  ['t1',7,10],['t1',8,10],['t1',9,10],['t1',10,10],['t1',11,11],['t1',12,11],['t1',1,11],
  // 마케팅팀
  ['t2',2,5],['t2',3,5],['t2',4,5],['t2',5,6],['t2',6,6],
  ['t2',7,6],['t2',8,5],['t2',9,5],['t2',10,5],['t2',11,5],['t2',12,5],['t2',1,5],
  // 데이터팀
  ['t3',2,6],['t3',3,6],['t3',4,6],['t3',5,6],['t3',6,7],
  ['t3',7,7],['t3',8,7],['t3',9,7],['t3',10,8],['t3',11,8],['t3',12,8],['t3',1,8],
  // 영업팀
  ['t4',2,7],['t4',3,7],['t4',4,7],['t4',5,8],['t4',6,8],
  ['t4',7,8],['t4',8,8],['t4',9,7],['t4',10,7],['t4',11,7],['t4',12,7],['t4',1,7],
  // 경영지원팀
  ['t5',2,4],['t5',3,4],['t5',4,4],['t5',5,4],['t5',6,4],
  ['t5',7,4],['t5',8,4],['t5',9,4],['t5',10,4],['t5',11,4],['t5',12,4],['t5',1,4],
]

export const MOCK_HEADCOUNTS: MonthlyHeadcount[] = headcounts.map(([teamId, month, headcount]) => ({
  teamId,
  fiscalYear: FY,
  month,
  headcount,
}))

// actual spending - realistic partial execution (current month: May 2025 = month 5)
const actualSpend: Record<string, Record<number, number>> = {
  t1: { 2: 385000, 3: 390000, 4: 432000, 5: 410000 },
  t2: { 2: 240000, 3: 235000, 4: 242000, 5: 260000 },
  t3: { 2: 285000, 3: 290000, 4: 295000, 5: 320000 },
  t4: { 2: 320000, 3: 315000, 4: 340000, 5: 290000 },
  t5: { 2: 180000, 3: 185000, 4: 188000, 5: 175000 },
}

let entryId = 1
export const MOCK_BUDGET_ENTRIES: BudgetEntry[] = headcounts.map(([teamId, month, hc]) => {
  const allocated = calcAllocated(hc)
  const actual = actualSpend[teamId]?.[month] ?? 0
  return {
    id: `be${entryId++}`,
    teamId,
    fiscalYear: FY,
    month,
    allocatedAmount: allocated,
    actualAmount: actual,
    description: actual > 0 ? '팀 활동비' : undefined,
  }
})

export const DEFAULT_TRAFFIC_LIGHT_CONFIG: TrafficLightConfig = {
  greenMin: 80,
  greenMax: 100,
  yellowLowMin: 60,
  yellowHighMax: 120,
}
