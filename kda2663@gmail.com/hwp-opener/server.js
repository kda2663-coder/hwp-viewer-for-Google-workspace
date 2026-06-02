// 한글 열기 도우미 — 로컬 상주 서버 (본인 PC 전용)
// 웹앱 뷰어의 "한글로 편집"이 호출하면, 드라이브 파일을 PC 한글 프로그램으로 연다.
// 두 가지 방식 지원:
//   /openById?fileId=...  (권장) — Drive for desktop 메타DB에서 파일 위치를 직접 찾음 (drive.file 권한과 호환)
//   /open?rel=...         (구버전) — 웹앱이 만든 상대경로로 찾음
// 실행: 같은 폴더의 "한글열기도우미_실행.bat" 더블클릭
//   ※ node:sqlite 사용을 위해 --experimental-sqlite 플래그로 실행됨 (bat에 포함)

const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');
const url = require('url');
const path = require('path');

const PORT = 17654;
const ALLOW_ORIGIN = 'https://hwp-drive-sync.web.app';

// Drive for desktop 마운트된 드라이브 문자 자동 탐지 (G:, H: 등 PC마다 달라도 찾음)
const ROOT_MARKERS = ['내 드라이브', 'My Drive', '공유 드라이브', 'Shared drives'];
function findDriveLetters() {
  const bases = [];
  const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  for (const L of letters) {
    const base = L + ':\\';
    for (const m of ROOT_MARKERS) {
      try { if (fs.statSync(base + m).isDirectory()) { bases.push(base); break; } } catch (_) { /* 없음 무시 */ }
    }
  }
  return bases;
}

// ── Drive for desktop 메타데이터 DB에서 fileId → 드라이브 루트 기준 상대경로 조립 ──
// DB 위치: %LOCALAPPDATA%\Google\DriveFS\<계정ID>\metadata_sqlite_db
// 읽기 전용 + immutable 로 열어 드라이브앱이 사용 중이어도 안전·고속(수십ms).
let DatabaseSync = null;
try { ({ DatabaseSync } = require('node:sqlite')); } catch (_) { /* 구버전 Node — openById 비활성 */ }

function metaDbPaths() {
  const base = path.join(process.env.LOCALAPPDATA || '', 'Google', 'DriveFS');
  const out = [];
  try {
    for (const acct of fs.readdirSync(base)) {
      if (!/^\d+$/.test(acct)) continue;
      const db = path.join(base, acct, 'metadata_sqlite_db');
      if (fs.existsSync(db)) out.push(db);
    }
  } catch (_) { /* DriveFS 폴더 없음 */ }
  return out;
}

function openDbReadonly(dbPath) {
  // immutable=1: 사용 중인 DB도 잠금 없이 읽기 (변경 감지 안 함 — 경로 정보엔 충분)
  try {
    const uri = 'file:' + dbPath.replace(/\\/g, '/') + '?immutable=1';
    return new DatabaseSync(uri, { readOnly: true });
  } catch (_) {
    try { return new DatabaseSync(dbPath, { readOnly: true }); } catch (_) { return null; }
  }
}

// fileId → "루트폴더\...\파일.hwp" (드라이브 루트 기준 상대경로). 못 찾으면 null.
function relPathFromFileId(fileId) {
  if (!DatabaseSync) return null;
  for (const dbPath of metaDbPaths()) {
    const db = openDbReadonly(dbPath);
    if (!db) continue;
    try {
      const row = db.prepare('SELECT stable_id, local_title FROM items WHERE id=? LIMIT 1').get(fileId);
      if (!row) { db.close(); continue; }
      const nameStmt = db.prepare('SELECT local_title FROM items WHERE stable_id=?');
      const parentStmt = db.prepare('SELECT parent_stable_id FROM stable_parents WHERE item_stable_id=?');
      const segs = [];
      let cur = row.stable_id;
      for (let i = 0; i < 80; i++) {
        const n = nameStmt.get(cur);
        segs.unshift(n && n.local_title ? n.local_title : '');
        const p = parentStmt.get(cur);
        if (!p) break;
        cur = p.parent_stable_id;
      }
      db.close();
      return segs.filter(Boolean).join('\\');
    } catch (_) {
      try { db.close(); } catch (_) {}
    }
  }
  return null;
}

// 드라이브 루트 기준 상대경로 → 실제 PC 전체경로. 내 드라이브/공유 드라이브 양쪽 후보로 실제 존재하는 것 찾기.
function resolveFullPath(rel) {
  const bases = findDriveLetters();
  const prefixes = ['내 드라이브', 'My Drive', '공유 드라이브', 'Shared drives'];
  const tried = [];
  for (const base of bases) {
    for (const pre of prefixes) {
      const cand = path.join(base, pre, rel);
      tried.push(cand);
      if (fs.existsSync(cand)) return { full: cand, tried };
    }
    // prefix 없이 직접 (rel 자체에 루트가 포함된 경우 대비)
    const direct = path.join(base, rel);
    tried.push(direct);
    if (fs.existsSync(direct)) return { full: direct, tried };
  }
  return { full: null, tried };
}

function openInHangul(full, res) {
  try {
    spawn('cmd', ['/c', 'start', '""', `"${full}"`], { windowsVerbatimArguments: true, stdio: 'ignore' });
    console.log('  열기:', full);
    res.writeHead(200); res.end('opening');
  } catch (e) {
    console.error('  실행 실패:', e.message);
    res.writeHead(500); res.end('실행 실패: ' + e.message);
  }
}

http.createServer((req, res) => {
  const u = url.parse(req.url, true);
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (u.pathname === '/ping') { res.writeHead(200); res.end('ok'); return; }

  if (u.pathname === '/root') { res.writeHead(200); res.end(findDriveLetters().join(' | ')); return; }

  // ── 권장: fileId 로 열기 (drive.file 권한과 호환) ──
  if (u.pathname === '/openById') {
    const fileId = (u.query.fileId || '').toString();
    if (!fileId) { res.writeHead(400); res.end('fileId 필요'); return; }
    console.log('── openById ──');
    console.log('  fileId:', fileId);
    if (!DatabaseSync) {
      res.writeHead(501);
      res.end('이 기능은 Node 22.5+ 가 필요합니다 (node:sqlite). Node를 최신 LTS로 업데이트하세요.');
      return;
    }
    const rel = relPathFromFileId(fileId);
    if (!rel) {
      console.log('  결과: ❌ 메타DB에서 파일 못 찾음 (동기화 안 됨 / Drive for desktop 미설치)');
      res.writeHead(404); res.end('파일을 찾을 수 없습니다. Google Drive 데스크톱 앱이 설치·동기화돼 있는지 확인하세요.');
      return;
    }
    console.log('  상대경로:', rel);
    if (!/\.hwpx?$/i.test(rel)) { res.writeHead(400); res.end('hwp/hwpx만 지원'); return; }
    const { full, tried } = resolveFullPath(rel);
    if (!full) {
      console.log('  결과: ❌ 실제 파일 없음. 시도한 경로:');
      tried.forEach(t => console.log('    · ' + t));
      res.writeHead(404); res.end('로컬에 파일이 없습니다 (스트림 전용 폴더이거나 미동기화). 시도: ' + tried.slice(0, 4).join(' , '));
      return;
    }
    console.log('  찾음:', full);
    openInHangul(full, res);
    return;
  }

  // ── 구버전: 웹앱이 만든 상대경로로 열기 (하위호환) ──
  if (u.pathname === '/open') {
    const rel = (u.query.rel || '').toString();
    if (!/\.hwpx?$/i.test(rel)) { res.writeHead(400); res.end('hwp/hwpx만 지원'); return; }
    const bases = findDriveLetters();
    if (!bases.length) { res.writeHead(500); res.end('드라이브를 못 찾음 (Drive for desktop 확인)'); return; }
    console.log('── open (rel) ──');
    console.log('  받은 경로:', rel);
    let full = null;
    for (const base of bases) {
      const cand = path.join(base, rel);
      if (fs.existsSync(cand)) { full = cand; break; }
    }
    if (!full) {
      console.log('  결과: ❌ 파일 없음');
      res.writeHead(404); res.end('파일 없음 (후보: ' + bases.map(b => path.join(b, rel)).join(' , ') + ')'); return;
    }
    console.log('  찾음:', full);
    openInHangul(full, res);
    return;
  }

  res.writeHead(404); res.end();
}).listen(PORT, '127.0.0.1', () => {
  const bases = findDriveLetters();
  console.log('==============================================');
  console.log(' 한글 열기 도우미 실행 중 — http://127.0.0.1:' + PORT);
  console.log(' 드라이브:', bases.length ? bases.join(' | ') : '(못 찾음 — Drive for desktop 확인)');
  console.log(' 메타DB:', DatabaseSync ? (metaDbPaths().length + '개 발견') : '비활성(Node 22.5+ 필요)');
  console.log(' 이 창을 열어둔 채로 웹앱에서 "한글로 편집"을 누르세요.');
  console.log('==============================================');
});
