// 한글 드라이브 편집기 — MVP
// 흐름: 드라이브에서 hwp 받아 열기 → rhwp 편집기로 편집 → 드라이브에 다시 저장
// (구글 설정 전이라도 "내 PC 파일 열기"로 편집기 동작은 바로 확인 가능)

import { createEditor } from 'https://esm.sh/@rhwp/editor@0.7.13';

// ───────────────────────────────────────────────────────────
// 설정 — 구글 클라우드에서 OAuth 클라이언트 ID 발급 후 여기에 붙여넣기
const CONFIG = {
  CLIENT_ID: '442438589836-5eqnquabmics5sbim9fnf5dqu2cjl3hv.apps.googleusercontent.com',
  API_KEY: 'AIzaSyBcqOIvVquz0EMGzGVc7bxtWOlY-Rzx8f0',  // Picker용 (Google Picker API로 제한됨)
  APP_ID: '442438589836', // 프로젝트 번호 (클라이언트 ID 앞부분) — Picker가 고른 파일을 우리 앱에 연결하는 데 필요
  SCOPE: 'https://www.googleapis.com/auth/drive.file', // 내 앱으로 연 파일만 접근
};
// ───────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);
const statusEl = $('status');

// ── 화면 내 진단 로그 (F12 없이 상태 확인) ──
function log(msg, isErr = false) {
  const el = $('log');
  if (!el) return;
  const line = document.createElement('div');
  if (isErr) line.className = 'err';
  const t = new Date().toLocaleTimeString();
  line.textContent = `[${t}] ${msg}`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}
// 전역 에러도 로그창에 표시
window.addEventListener('error', (e) => log('JS 오류: ' + (e.message || e), true));
window.addEventListener('unhandledrejection', (e) => log('처리안된 오류: ' + (e.reason?.message || e.reason), true));
// 진단 로그는 평소 숨김 — 주소에 ?debug=1 일 때만 표시
if (new URLSearchParams(location.search).has('debug')) {
  const _l = $('log'); if (_l) _l.style.display = 'block';
}

let editor = null;       // rhwp 편집기 인스턴스
let accessToken = null;  // 구글 액세스 토큰
let tokenClient = null;  // GIS 토큰 발급기
let currentFile = {      // 현재 열린 문서 정보
  driveId: null,         // 드라이브 파일 ID (드라이브에서 연 경우)
  extId: null,           // 확장프로그램으로 연 경우, 그 확장 ID (저장도 확장에 위임)
  name: 'document.hwp',
};

// ── 상태 메시지 토스트 ──
let statusTimer = null;
function setStatus(msg, keep = false) {
  statusEl.textContent = msg;
  statusEl.classList.add('show');
  clearTimeout(statusTimer);
  if (!keep) statusTimer = setTimeout(() => statusEl.classList.remove('show'), 2600);
}

// ── 편집기 초기화 ──
async function initEditor() {
  setStatus('편집기 불러오는 중…', true);
  log('편집기 초기화 시작 (studio iframe 로드 대기)…');
  try {
    editor = await createEditor('#editor');  // 기본 studio(edwardkim.github.io)를 iframe으로 임베드
    log('편집기 준비 완료 ✓');
    setStatus('편집기 준비 완료');
  } catch (err) {
    log('편집기 초기화 실패: ' + err.message, true);
    setStatus('편집기 초기화 실패: ' + err.message, true);
    throw err;
  }
}

// ── 처음 안내 오버레이 숨기기 ──
function hideWelcome() {
  const w = $('welcome');
  if (w) w.style.display = 'none';
}

// ── 편집기에 바이트 로드 ──
async function loadBytes(bytes, name) {
  hideWelcome();
  setStatus(`"${name}" 여는 중…`, true);
  log(`loadFile 호출: ${name}, ${bytes.length} bytes`);
  if (!editor) { log('편집기가 아직 준비 안 됨 (editor=null)', true); throw new Error('편집기 미준비'); }
  const result = await editor.loadFile(bytes, name);
  log(`loadFile 응답: pageCount=${result?.pageCount}`);
  currentFile.name = name;
  $('fileName').textContent = name;
  const _save = $('btnSave'); if (_save) _save.disabled = false;  // 뷰어 모드: 저장 버튼 없음
  setStatus(`"${name}" 열림 (${result.pageCount}페이지)`);
}

// ── 1) 내 PC 파일 열기 (구글 없이도 동작 — 편집기 확인용) ──
function openLocalPicker() {
  $('fileInput').click();
}
$('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const buf = await file.arrayBuffer();
    currentFile.driveId = null; // 로컬 파일은 드라이브 ID 없음 → 저장 시 다운로드
    currentFile.extId = null;
    await loadBytes(new Uint8Array(buf), file.name);
  } catch (err) {
    setStatus('열기 실패: ' + err.message);
    console.error(err);
  } finally {
    e.target.value = ''; // 같은 파일 다시 선택 가능하게
  }
});

// ── 2) 구글 로그인 (토큰 발급) ──
function waitForGoogle() {
  return new Promise((resolve) => {
    const t = setInterval(() => {
      if (window.google?.accounts?.oauth2) { clearInterval(t); resolve(); }
    }, 100);
  });
}

async function ensureToken() {
  if (accessToken) return accessToken;
  if (!CONFIG.CLIENT_ID) {
    setStatus('아직 구글 클라이언트 ID가 설정되지 않았어요 (app.js의 CONFIG)', true);
    throw new Error('CLIENT_ID 미설정');
  }
  await waitForGoogle();
  if (!tokenClient) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: CONFIG.SCOPE,
      callback: () => {}, // 아래 requestToken에서 매번 교체
    });
  }
  return new Promise((resolve, reject) => {
    tokenClient.callback = (resp) => {
      if (resp.error) { reject(new Error(resp.error)); return; }
      accessToken = resp.access_token;
      resolve(accessToken);
    };
    tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
  });
}

// ── 3) 드라이브 파일 선택창(Picker)으로 파일 고르기 ──
function waitForGapi() {
  return new Promise((resolve) => {
    const t = setInterval(() => { if (window.gapi) { clearInterval(t); resolve(); } }, 100);
  });
}
let pickerLoaded = false;
function loadPicker() {
  return new Promise((resolve, reject) => {
    if (pickerLoaded) return resolve();
    gapi.load('picker', { callback: () => { pickerLoaded = true; resolve(); }, onerror: reject });
  });
}
async function openFromDrivePicker() {
  try {
    if (!CONFIG.API_KEY) { setStatus('아직 API 키가 설정되지 않았어요 (app.js의 CONFIG.API_KEY)', true); log('API 키 미설정', true); return; }
    await ensureToken();
    { const _lb = $('btnLogin'); if (_lb) _lb.textContent = '✓ 구글 연결됨'; }
    await waitForGapi();
    await loadPicker();
    log('드라이브 파일 선택창 여는 중…');
    const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setIncludeFolders(false)
      .setSelectFolderEnabled(false);
    const picker = new google.picker.PickerBuilder()
      .setAppId(CONFIG.APP_ID)
      .setOAuthToken(accessToken)
      .setDeveloperKey(CONFIG.API_KEY)
      .addView(view)
      .setCallback((data) => {
        if (data.action === google.picker.Action.PICKED) {
          const doc = data.docs[0];
          log('파일 선택됨: ' + doc.name + ' (' + doc.id + ')');
          openFromDrive(doc.id).catch((e) => { log('드라이브 열기 실패: ' + e.message, true); setStatus('드라이브 열기 실패: ' + e.message, true); });
        }
      })
      .build();
    picker.setVisible(true);
  } catch (err) {
    log('Picker 오류: ' + err.message, true);
    setStatus('드라이브 파일 선택 실패: ' + err.message, true);
  }
}

// ── 드라이브에서 파일 다운로드 후 편집기에 열기 ──
async function openFromDrive(fileId) {
  await ensureToken();
  setStatus('드라이브에서 파일 정보 확인 중…', true);
  // 파일 이름
  const metaResp = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name&supportsAllDrives=true`,
    { headers: { Authorization: 'Bearer ' + accessToken } }
  );
  if (!metaResp.ok) {
    const body = await metaResp.text();
    log('파일 정보 응답 본문: ' + body.slice(0, 300), true);
    throw new Error('파일 정보 실패: ' + metaResp.status);
  }
  const meta = await metaResp.json();
  // 파일 내용 다운로드
  setStatus('드라이브에서 내용 다운로드 중…', true);
  const dataResp = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: 'Bearer ' + accessToken } }
  );
  if (!dataResp.ok) {
    const body = await dataResp.text();
    log('다운로드 응답 본문: ' + body.slice(0, 300), true);
    throw new Error('다운로드 실패: ' + dataResp.status);
  }
  const buf = await dataResp.arrayBuffer();
  currentFile.driveId = fileId;
  currentFile.extId = null;
  await loadBytes(new Uint8Array(buf), meta.name || 'document.hwp');
}

// ── 4) 저장 ──
async function save() {
  if (!editor) return;
  try {
    setStatus('hwp로 변환 중…', true);
    log('exportHwp 호출…');
    const bytes = await editor.exportHwp();
    log(`exportHwp 완료: ${bytes.length} bytes`);

    if (currentFile.extId && currentFile.driveId) {
      // 확장프로그램으로 연 파일 → 저장도 확장에 위임 (확장이 드라이브에 업로드)
      setStatus('드라이브에 저장 중…', true);
      await extSend(currentFile.extId, { cmd: 'upload', fileId: currentFile.driveId, bytes: Array.from(bytes) });
      setStatus('드라이브에 저장 완료 ✅');
    } else if (currentFile.driveId) {
      // 드라이브에서 연 파일 → 드라이브에 덮어쓰기
      await ensureToken();
      setStatus('드라이브에 저장 중…', true);
      const resp = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${currentFile.driveId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: 'Bearer ' + accessToken,
            'Content-Type': 'application/octet-stream',
          },
          body: bytes,
        }
      );
      if (!resp.ok) throw new Error('저장 실패: ' + resp.status);
      setStatus('드라이브에 저장 완료 ✅');
    } else {
      // 로컬에서 연 파일 → "다운로드 폴더"에 새 파일로 저장 (원본 덮어쓰기는 브라우저가 금지)
      const outName = (currentFile.name || 'document.hwp').replace(/(\.hwpx?)$/i, '_수정$1');
      const blob = new Blob([bytes], { type: 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = outName;
      a.click();
      URL.revokeObjectURL(a.href);
      log(`다운로드 폴더에 저장: ${outName}`);
      setStatus(`다운로드 폴더에 "${outName}" 로 저장됨 ✅`);
    }
  } catch (err) {
    setStatus('저장 실패: ' + err.message);
    console.error(err);
  }
}

// ── 드라이브 "연결 앱"으로 열렸을 때: ?state=... 에서 파일 ID 꺼내기 ──
function getDriveFileIdFromUrl() {
  const params = new URLSearchParams(location.search);
  const state = params.get('state');
  if (!state) return null;
  try {
    const obj = JSON.parse(state);
    if (obj.ids && obj.ids.length) return obj.ids[0];
  } catch { /* 무시 */ }
  return null;
}

// ── 버튼 연결 ──
$('btnOpenDrive').addEventListener('click', openFromDrivePicker);
$('btnOpenLocal').addEventListener('click', openLocalPicker);
$('btnOpenLocal2')?.addEventListener('click', openLocalPicker);
// 뷰어 모드: 저장·로그인 버튼은 UI에서 제거됨 (로그인은 "드라이브에서 열기" 시 자동 처리).
// 저장 기능 코드(save 함수)는 편집 모드 복구를 위해 남겨둠.
$('btnSave')?.addEventListener('click', save);
$('btnLogin')?.addEventListener('click', async () => {
  log('구글 로그인 시도…');
  try {
    await ensureToken();
    { const _lb = $('btnLogin'); if (_lb) _lb.textContent = '✓ 구글 연결됨'; }
    log('구글 로그인 완료 ✓ (토큰 받음)');
    setStatus('구글 로그인 완료');
  } catch (err) {
    log('로그인 실패: ' + err.message, true);
    setStatus('로그인 실패: ' + err.message, true);
  }
});

// ── 드라이브에서 열렸을 때: 자동 로그인 팝업은 브라우저가 막으므로, 클릭 한 번으로 시작 ──
function showDriveOpenPrompt(fileId) {
  const run = () => openFromDrive(fileId).catch((err) => {
    setStatus('드라이브 열기 실패: ' + err.message, true);
    log('드라이브 열기 실패: ' + err.message, true);
  });
  const card = document.querySelector('#welcome .card');
  if (!card) { run(); return; }
  card.innerHTML =
    '<h2>드라이브 문서 열기</h2>' +
    '<p>구글 드라이브의 문서를 가져옵니다.<br />아래 버튼을 누르면 로그인 후 문서가 열립니다.</p>' +
    '<button id="btnDriveOpen" class="primary" style="border:none;border-radius:6px;padding:9px 16px;background:#2563eb;color:#fff;cursor:pointer;font-size:14px;">문서 열기</button>';
  document.getElementById('btnDriveOpen').addEventListener('click', run);
}

// ── 확장프로그램과 통신 (외부 페이지 → 확장) ──
function extSend(extId, msg) {
  return new Promise((resolve, reject) => {
    if (!window.chrome?.runtime?.sendMessage) { reject(new Error('확장프로그램을 찾을 수 없어요')); return; }
    chrome.runtime.sendMessage(extId, msg, (resp) => {
      if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
      if (resp?.error) { reject(new Error(resp.error)); return; }
      resolve(resp);
    });
  });
}

// ── 확장프로그램이 드라이브 파일을 넘겨준 경우: 확장에 바이트 요청 → 편집기에 열기 ──
async function openFromExtension(fileId, extId) {
  hideWelcome();
  setStatus('드라이브에서 파일 가져오는 중…', true);
  log(`확장 통해 다운로드 요청: ${fileId}`);
  const resp = await extSend(extId, { cmd: 'download', fileId });
  currentFile.driveId = fileId;
  currentFile.extId = extId;
  await loadBytes(new Uint8Array(resp.bytes), resp.name || 'document.hwp');
}

// ── 시작 ──
(async () => {
  await initEditor();
  const params = new URLSearchParams(location.search);

  // 데모 모드: ?demo=1 — 서버의 테스트 hwp 파일 자동 로드 (스크린샷용)
  if (params.get('demo') === '1') {
    try {
      const resp = await fetch('./%ED%85%8C%EC%8A%A4%ED%8A%B8%EC%9A%A9%20%EC%95%84%EB%AC%B4%EB%A7%90.hwp');
      const buf = await resp.arrayBuffer();
      await loadBytes(new Uint8Array(buf), '샘플문서.hwp');
    } catch (err) {
      log('데모 파일 로드 실패: ' + err.message, true);
    }
    return;
  }

  if (params.get('source') === 'ext') {
    // 확장프로그램이 연 경우
    const fileId = params.get('fileId');
    const extId = params.get('extId');
    if (fileId && extId) {
      openFromExtension(fileId, extId).catch((err) => {
        setStatus('열기 실패: ' + err.message, true); log('확장 열기 실패: ' + err.message, true);
      });
    }
    return;
  }
  const fileId = getDriveFileIdFromUrl();
  if (fileId) showDriveOpenPrompt(fileId);  // 드라이브 연결앱(A)으로 열린 경우: 클릭으로 열기 (팝업 차단 회피)
})();
