# 티브리지 시설 대기관리 시스템

멀티테넌트 SaaS 대기관리 플랫폼 (React + Express + PostgreSQL)

## 빠른 시작

```bash
# 1) PostgreSQL 실행 (Docker 또는 로컬)
# Docker:
docker compose up -d
# 로컬(포트 5433 예시):
# export PATH="/Library/PostgreSQL/18/bin:$PATH"
# pg_ctl -D .pgdata -l .pgdata/logfile -o "-p 5433" start

# 2) 의존성 설치
npm run install:all

# 3) DB 스키마/시드
npm run db:init
npm run db:seed

# 4) 개발 서버
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:4000
- 기본 `DATABASE_URL`: `postgresql://tbridge@localhost:5433/tbridge_waiting`

## 데모 계정 / URL

| 구분 | URL / 계정 |
|---|---|
| 고객 화면 | http://localhost:5173/w/demo-park |
| 시설 관리자 | http://localhost:5173/admin/demo-park/login (`demo` / `demo1234`) |
| 시스템 관리자 | http://localhost:5173/system-admin/login (`sysadmin` / `admin1234`) |
| 사이니지 | http://localhost:5173/signage/demo-park |

## 구조

```
client/   React (Vite) 프론트엔드
server/   Express API (Controller → Service → Repository)
```

카카오 알림톡은 티브리지 공용 발신프로필/템플릿(시설사 변수 주입) + mock 발송이며, 발송 시 선불 잔액이 차감되고 `usage_history`에 집계됩니다.

### 추가 기능
- 웨이팅 완료 페이지: `/w/{facility_code}/complete/{waiting_id}`
- 미루기 설정: 관리자 설정 > 미루기 없음 / 선택 순서 / 마지막 순서
- 고객 관리 · 알림톡 충전/집계 메뉴 (시설사/시스템 관리자)
- DB 마이그레이션: `npm run db:migrate`
