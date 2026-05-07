import {
  MONTHLY_ALLOWANCE_PER_PERSON,
  MONTHS,
  formatCurrency,
  summarizeTeams,
} from './budget.js';

const thresholds = {
  green: 70,
  yellow: 85,
  red: 100,
};

const teams = [
  {
    name: 'Data Platform',
    owner: '김도윤',
    spent: 3520000,
    headcountByMonth: [7, 7, 8, 8, 8, 9, 9, 9, 8, 8, 8, 8],
  },
  {
    name: 'Product Growth',
    owner: '박서연',
    spent: 2410000,
    headcountByMonth: [5, 5, 5, 6, 6, 6, 6, 6, 7, 7, 7, 7],
  },
  {
    name: 'AI Solution',
    owner: '이준호',
    spent: 4980000,
    headcountByMonth: [8, 8, 8, 8, 9, 9, 10, 10, 10, 10, 10, 10],
  },
  {
    name: 'Business Ops',
    owner: '최민지',
    spent: 1510000,
    headcountByMonth: [4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5],
  },
];

const summarizedTeams = summarizeTeams(teams, thresholds);
const totalBudget = summarizedTeams.reduce((sum, team) => sum + team.budget, 0);
const totalSpent = summarizedTeams.reduce((sum, team) => sum + team.spent, 0);
const averageRate = Math.round((totalSpent / totalBudget) * 1000) / 10;
const totalHeadcount = teams.reduce(
  (sum, team) => sum + team.headcountByMonth[team.headcountByMonth.length - 1],
  0,
);

function renderSignal(signal) {
  return `<span class="signal signal-${signal.tone}"><span></span>${signal.label}</span>`;
}

function renderTeamRows() {
  return summarizedTeams
    .map(
      (team) => `
        <tr>
          <td>
            <strong>${team.name}</strong>
            <small>담당 ${team.owner}</small>
          </td>
          <td>${formatCurrency(team.budget)}</td>
          <td>${formatCurrency(team.spent)}</td>
          <td>
            <div class="progress-cell">
              <span>${team.rate}%</span>
              <div class="progress"><i style="width:${Math.min(team.rate, 120)}%"></i></div>
            </div>
          </td>
          <td>${renderSignal(team.signal)}</td>
        </tr>
      `,
    )
    .join('');
}

function renderHeadcountGrid() {
  return summarizedTeams
    .map(
      (team) => `
        <article class="headcount-card">
          <div>
            <strong>${team.name}</strong>
            <span>입퇴사 반영 월별 인원</span>
          </div>
          <div class="month-grid">
            ${MONTHS.map(
              (month, index) => `
                <label>
                  <span>${month}</span>
                  <input value="${team.headcountByMonth[index]}" inputmode="numeric" aria-label="${team.name} ${month} 인원" />
                </label>
              `,
            ).join('')}
          </div>
        </article>
      `,
    )
    .join('');
}

function renderApp() {
  document.querySelector('#app').innerHTML = `
    <div class="shell">
      <aside class="sidebar" aria-label="주요 메뉴">
        <div class="brand-mark">
          <span></span>
          <strong>TeamBudget</strong>
        </div>
        <nav>
          <a class="active" href="#dashboard">조직 모니터링</a>
          <a href="#teams">팀별 예산</a>
          <a href="#headcount">월별 인원</a>
          <a href="#settings">신호등 기준</a>
        </nav>
        <div class="login-card">
          <span>SSO 로그인</span>
          <strong>budget-admin@company.io</strong>
        </div>
      </aside>

      <main>
        <section class="hero" id="dashboard">
          <div class="hero-copy">
            <p class="eyebrow">FY2026 · 2월부터 2027년 1월까지</p>
            <h1>팀 예산 총량과 집행 상태를 한눈에 모니터링하세요.</h1>
            <p>
              인당 월 ${formatCurrency(MONTHLY_ALLOWANCE_PER_PERSON)} 기준으로 입퇴사자 변동을 반영하고,
              관리자 기준에 맞춘 신호등으로 조직 전체 위험도를 빠르게 확인합니다.
            </p>
            <div class="hero-actions">
              <button>Excel 가져오기</button>
              <button class="ghost">팀 추가</button>
            </div>
          </div>
          <div class="hero-panel" aria-label="전체 조직 요약">
            <span>전체 집행률</span>
            <strong>${averageRate}%</strong>
            <div class="large-progress"><i style="width:${averageRate}%"></i></div>
            <small>${formatCurrency(totalSpent)} / ${formatCurrency(totalBudget)}</small>
          </div>
        </section>

        <section class="metric-grid" aria-label="핵심 지표">
          <article>
            <span>전체 예산</span>
            <strong>${formatCurrency(totalBudget)}</strong>
            <small>팀원 월별 합산 기준</small>
          </article>
          <article>
            <span>전체 집행액</span>
            <strong>${formatCurrency(totalSpent)}</strong>
            <small>Excel 지출내역 연동 예정</small>
          </article>
          <article>
            <span>현재 인원</span>
            <strong>${totalHeadcount}명</strong>
            <small>1월 기준 팀원 합계</small>
          </article>
          <article>
            <span>상태 기준</span>
            <strong>${thresholds.yellow}% / ${thresholds.red}%</strong>
            <small>관리자 설정 가능</small>
          </article>
        </section>

        <section class="content-card" id="teams">
          <div class="section-title">
            <div>
              <p class="eyebrow">Organization Overview</p>
              <h2>팀별 예산 집행 현황</h2>
            </div>
            <button class="ghost compact">CSV 내보내기</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>팀</th>
                  <th>예산 총량</th>
                  <th>집행액</th>
                  <th>집행률</th>
                  <th>신호등</th>
                </tr>
              </thead>
              <tbody>${renderTeamRows()}</tbody>
            </table>
          </div>
        </section>

        <section class="split-layout">
          <div class="content-card" id="headcount">
            <div class="section-title">
              <div>
                <p class="eyebrow">Headcount Plan</p>
                <h2>월별 인원 변동 관리</h2>
              </div>
            </div>
            <div class="headcount-list">${renderHeadcountGrid()}</div>
          </div>

          <div class="content-card settings-card" id="settings">
            <div class="section-title">
              <div>
                <p class="eyebrow">Admin Settings</p>
                <h2>신호등 기준</h2>
              </div>
            </div>
            <label>
              <span>안정 상한</span>
              <input value="${thresholds.green}% 이하" readonly />
            </label>
            <label>
              <span>주의 시작</span>
              <input value="${thresholds.yellow}% 이상" readonly />
            </label>
            <label>
              <span>위험 시작</span>
              <input value="${thresholds.red}% 이상" readonly />
            </label>
            <p>관리자는 팀 성격에 따라 집행률 기준을 조정하고 변경 이력을 남길 수 있습니다.</p>
          </div>
        </section>
      </main>
    </div>
  `;
}

renderApp();
