export const MONTHS = [
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
  '1월',
];

export const MONTHLY_ALLOWANCE_PER_PERSON = 50000;

export function formatCurrency(value) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

export function calculateAnnualBudget(headcountByMonth) {
  return headcountByMonth.reduce(
    (total, headcount) => total + headcount * MONTHLY_ALLOWANCE_PER_PERSON,
    0,
  );
}

export function calculateExecutionRate(spent, budget) {
  if (budget === 0) {
    return 0;
  }

  return Math.round((spent / budget) * 1000) / 10;
}

export function getSignal(rate, thresholds) {
  if (rate >= thresholds.red) {
    return { label: '위험', tone: 'red' };
  }

  if (rate >= thresholds.yellow) {
    return { label: '주의', tone: 'yellow' };
  }

  return { label: '안정', tone: 'green' };
}

export function summarizeTeams(teams, thresholds) {
  return teams.map((team) => {
    const budget = calculateAnnualBudget(team.headcountByMonth);
    const rate = calculateExecutionRate(team.spent, budget);

    return {
      ...team,
      budget,
      rate,
      signal: getSignal(rate, thresholds),
    };
  });
}
