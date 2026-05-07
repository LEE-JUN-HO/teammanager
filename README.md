# TeamManager

Vercel에 바로 배포할 수 있는 정적 팀 관리 대시보드입니다.

## 로컬 실행

별도 패키지 설치 없이 정적 파일 서버로 실행할 수 있습니다.

```bash
python3 -m http.server 3000
```

브라우저에서 <http://localhost:3000>을 엽니다.

## Vercel 배포

GitHub 저장소가 Vercel 프로젝트와 연결되어 있으면 `main` 또는 연결된 브랜치에 push될 때 자동으로 배포됩니다.
