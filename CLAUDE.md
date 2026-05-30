# HWP Viewer for Google Workspace — 프로젝트 규칙

## ⚠️ 보안 — 이 저장소는 GitHub에 **공개(Public)** 된다
이 repo는 오픈소스로 공개되므로, 커밋 전 항상 아래를 엄격히 거른다.
**커밋·푸시 전 자가 점검 필수.**

### 절대 올리지 않는 것 (커밋 금지)
- **시크릿·비밀키**: OAuth client_secret(`GOCSPX-...`), 서비스계정 JSON, 프라이빗 키(`BEGIN ... PRIVATE KEY`), 비밀번호, 액세스 토큰
- **개인 설정 기록**: `SETUP.md`(계정·셋업값 모음), `.claude/`(로컬 설정)
- **업무·실데이터**: 실제 hwp/hwpx 문서, 그 내용이 찍힌 스크린샷(`screenshot_*.png`, `스크린샷*.png`)
- **백업·테스트 잔여물**: `_backup/`, `svg-test.html`, `demo_screenshot.html`

→ 위는 모두 `.gitignore`에 등록돼 있다. 새 민감 파일이 생기면 **먼저 .gitignore에 추가**하고 작업한다.

### 올려도 되는 것 (공개 안전)
- **OAuth Client ID** (`...apps.googleusercontent.com`) — 공개 전제 값, 비밀 아님
- **Picker API 키** (`AIza...`) — 브라우저 노출 정상. 단 **Google Cloud Console에서 도메인 제한** 걸 것
- 클라이언트 시크릿은 **사용하지 않음**(브라우저 토큰 방식)

### 커밋 전 점검 한 줄
새 파일·키 문자열을 추가했다면, 그게 위 "절대 금지"에 해당하는지 먼저 확인. 의심되면 커밋하지 말고 사용자에게 묻는다.

---

## 프로젝트 개요
구글 드라이브의 한글(HWP/HWPX) 문서를 브라우저에서 **다운로드 없이 바로 보는 뷰어**.
원하는 사람은 PC 한글 프로그램으로 바로 편집(로컬 도우미).

- **웹앱**(`index.html`/`app.js`): rhwp 엔진으로 hwp 렌더. 진입은 확장/마켓플레이스 공용(`?fileId=` 또는 `?state=`).
- **확장**(`extension/`): 드라이브에서 hwp 클릭 시 "한글로 보기" 버튼 → 웹앱 염. 로그인·다운로드는 웹앱이 함(확장 ID 무관).
- **로컬 도우미**(`hwp-opener/`): Node 로컬 서버. "한글로 편집" → 드라이브 데스크톱 경로의 원본을 PC 한글로 실행. **본인/파워유저용**(node 필요).
- 엔진: `@rhwp/editor@0.7.13` (MIT), esm.sh CDN 임베드. 빌드 없음.
- 배포: Firebase Hosting(무료) → https://hwp-drive-sync.web.app
- 권한(scope): `drive.readonly` (뷰어, 읽기 전용)

## 방향성 (결정됨)
- **상품 = 뷰어** (무설치, 모두 대상). 마켓플레이스(A) 우선 — 모바일도 됨.
- **로컬 한글 편집 = 부가기능** (node 깐 소수). 무설치 불가(브라우저 보안)는 수용.
- **유료화 안 함 → 오픈소스 공개** (명성 목적). rhwp가 MIT라 가능.
- Gmail 등 타 서비스 연동은 출시 후 2차.

## 작업 후 루틴
`git add -A && git commit && git push` (위 보안 점검 통과 후). 커밋 메시지는 글로벌 규칙 형식.
