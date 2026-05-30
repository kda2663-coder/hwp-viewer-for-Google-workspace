# HWP Editor for Google Workspace

구글 드라이브의 한글(HWP/HWPX) 문서를 **다운로드 없이 브라우저에서 바로 보는 뷰어**입니다.
원하면 PC에 설치된 한글 프로그램으로 원본을 바로 열어 편집할 수도 있습니다.

> 🔗 **바로 쓰기:** https://hwp-drive-sync.web.app

한컴 한글(HWP)은 한국 공공·업무 문서의 표준이지만, 구글 드라이브에서는 미리보기가 안 되거나 매번 다운로드해야 합니다.
이 도구는 그 불편을 없애기 위해 만들었습니다. 오픈소스 HWP 엔진 [rhwp](https://github.com/edwardkim/rhwp) 위에서 동작합니다.

## 기능
- 📄 **뷰어** — 드라이브의 hwp/hwpx를 브라우저에서 바로 열람 (설치 불필요)
- 🧩 **크롬 확장** — 드라이브에서 hwp 클릭 시 "한글로 보기" 버튼 표시
- 📝 **한글로 편집**(선택) — 로컬 도우미를 설치하면, 드라이브 원본을 PC 한글 프로그램으로 바로 실행

## 구성
| 폴더/파일 | 설명 |
|---|---|
| `index.html`, `app.js` | 웹앱(뷰어). rhwp 엔진으로 문서를 렌더링 |
| `extension/` | 크롬 확장 — 드라이브에서 웹앱을 여는 진입점 |
| `hwp-opener/` | 로컬 편집 도우미(Node.js) — "한글로 편집"용 (선택) |
| `privacy.html`, `terms.html`, `support.html` | 개인정보처리방침 · 약관 · 지원 |

## 설치 / 사용

### 1) 뷰어 (설치 불필요)
[https://hwp-drive-sync.web.app](https://hwp-drive-sync.web.app) 접속 → 드라이브에서 열기 / 내 PC 파일 열기.

### 2) 크롬 확장 (선택)
1. `extension` 폴더를 내려받습니다.
2. 크롬 `chrome://extensions` → **개발자 모드** 켜기 → **압축해제된 확장 프로그램을 로드** → `extension` 폴더 선택.
3. 드라이브에서 hwp 파일을 클릭하면 "📄 한글로 보기" 버튼이 뜹니다.

### 3) 로컬 편집 도우미 (선택 · Node.js 필요)
PC 한글 프로그램으로 원본을 바로 편집하고 싶을 때만.
1. [Node.js](https://nodejs.org/ko) 설치 (LTS)
2. [Releases](../../releases)에서 `hwp-opener.zip` 내려받아 압축 해제
3. `설치.bat` 더블클릭 → 이후 웹앱의 "한글로 편집" 버튼만 누르면 됩니다
- 전제: Google Drive 데스크톱 앱 + 한글(HWP) 프로그램 설치
- 공유받은 개별 파일·구글폼 응답 파일은 로컬에 없어 편집 불가(뷰어로만 열람)

## 기술 메모
- 엔진: [`@rhwp/editor`](https://www.npmjs.com/package/@rhwp/editor) (MIT) — esm.sh CDN으로 임베드, 별도 빌드 없음
- 권한: `drive.readonly` (읽기 전용 뷰어)
- 호스팅: Firebase Hosting

## 라이선스 / 고지
- 본 프로젝트: **MIT License** (아래 LICENSE 참고)
- HWP 처리 엔진: [rhwp](https://github.com/edwardkim/rhwp) — MIT, © Edward Kim
- "한글", "한컴", "HWP", "HWPX"는 ㈜한글과컴퓨터의 상표입니다.
- "Google", "Google Workspace", "Google Drive"는 Google LLC의 상표입니다.
- 본 프로젝트는 한글과컴퓨터·Google과 제휴 관계가 없는 독립 도구입니다.

## 문의
버그·제안: [이슈 등록](../../issues) 또는 kda2663@gmail.com
