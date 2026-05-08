import type { StatusType, TrafficLightConfig, FiscalMonth } from '../types'

export const MONTHLY_BUDGET_PER_PERSON = 50_000
export const MONTHLY_DIVISION_BUDGET_PER_PERSON = 33_333

/** 모든 페이지에서 공유하는 기본 설정값 — Supabase 로딩 전 폴백용 */
export const DEFAULT_CONFIG: TrafficLightConfig = {
  greenMin: 80, greenMax: 100,
  yellowLowMin: 60, yellowHighMax: 120,
  budgetPerPerson: MONTHLY_BUDGET_PER_PERSON,
  divisionBudgetPerPerson: MONTHLY_DIVISION_BUDGET_PER_PERSON,
}

export function getExecutionStatus(rate: number, config: TrafficLightConfig): StatusType {
  if (rate >= config.greenMin && rate <= config.greenMax) return 'green'
  if (
    (rate >= config.yellowLowMin && rate < config.greenMin) ||
    (rate > config.greenMax && rate <= config.yellowHighMax)
  )
    return 'yellow'
  return 'red'
}

export function calcAllocated(headcount: number, budgetPerPerson = MONTHLY_BUDGET_PER_PERSON): number {
  return headcount * budgetPerPerson
}

export function calcExecutionRate(actual: number, allocated: number): number {
  if (allocated === 0) return 0
  return Math.round((actual / allocated) * 1000) / 10
}

/** fiscal year months: Feb(fiscalYear) ~ Jan(fiscalYear+1) */
export function getFiscalMonths(fiscalYear: number): FiscalMonth[] {
  const months: FiscalMonth[] = []
  const labels = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
  const order = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1]
  for (const m of order) {
    const y = m === 1 ? fiscalYear + 1 : fiscalYear
    months.push({
      year: y,
      month: m,
      label: `${y}년 ${labels[m - 1]}`,
      shortLabel: m === 1 ? `'${String(fiscalYear + 1).slice(2)}년 1월` : labels[m - 1],
    })
  }
  return months
}

export function formatKRW(amount: number): string {
  if (amount >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(1)}억원`
  }
  if (amount >= 10_000) {
    return `${Math.floor(amount / 10_000).toLocaleString()}만원`
  }
  return `${amount.toLocaleString()}원`
}

export function formatKRWFull(amount: number): string {
  return `${amount.toLocaleString()}원`
}

export function getCurrentFiscalYear(): number {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  return month >= 2 ? year : year - 1
}

export function getCurrentFiscalMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}
