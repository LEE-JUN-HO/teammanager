const teamMembers = [
  { name: "민준", role: "Project Lead", status: "일정 조율", load: 72 },
  { name: "서연", role: "Product Designer", status: "시안 검토", load: 54 },
  { name: "지호", role: "Frontend Engineer", status: "배포 준비", load: 86 },
  { name: "하윤", role: "Backend Engineer", status: "API 점검", load: 63 },
];

const milestones = [
  { label: "요구사항 정리", date: "5월 10일", state: "완료" },
  { label: "프로토타입 공유", date: "5월 14일", state: "진행 중" },
  { label: "Vercel 프리뷰 확인", date: "5월 16일", state: "예정" },
];

const memberList = document.querySelector("#member-list");
const milestoneList = document.querySelector("#milestone-list");

memberList.innerHTML = teamMembers
  .map(
    (member) => `
      <div class="member-row">
        <div>
          <strong>${member.name}</strong>
          <span>${member.role}</span>
        </div>
        <div class="load-meter" aria-label="${member.name} 업무량 ${member.load}%">
          <span style="width: ${member.load}%"></span>
        </div>
        <em>${member.status}</em>
      </div>
    `,
  )
  .join("");

milestoneList.innerHTML = milestones
  .map(
    (milestone) => `
      <li>
        <div>
          <strong>${milestone.label}</strong>
          <span>${milestone.date}</span>
        </div>
        <mark>${milestone.state}</mark>
      </li>
    `,
  )
  .join("");
