// 한글 열기 도우미 — 로컬 상주 서버 (본인 PC 전용)
// 웹앱 뷰어의 "한글로 편집"이 호출하면, 드라이브 루트를 자동으로 찾아
// 그 경로의 hwp 파일을 PC 한글 프로그램으로 연다.
// 실행: 같은 폴더의 "한글열기도우미_실행.bat" 더블클릭 (또는: node server.js)

const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');
const url = require('url');
const path = require('path');

const PORT = 17654;
const ALLOW_ORIGIN = 'https://hwp-drive-sync.web.app';

// Drive for desktop 마운트된 드라이브 문자 자동 탐지 (G:, H: 등 PC마다 달라도 찾음)
// 웹앱이 "내 드라이브\..." / "공유 드라이브\..." 까지 만들어 보내므로, 여기선 드라이브 문자만 찾는다.
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

http.createServer((req, res) => {
  const u = url.parse(req.url, true);
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (u.pathname === '/ping') { res.writeHead(200); res.end('ok'); return; }

  if (u.pathname === '/root') { res.writeHead(200); res.end(findDriveLetters().join(' | ')); return; }

  if (u.pathname === '/open') {
    const rel = (u.query.rel || '').toString();  // 예: 내 드라이브\... 또는 공유 드라이브\팀\...
    if (!/\.hwpx?$/i.test(rel)) { res.writeHead(400); res.end('hwp/hwpx만 지원'); return; }
    const bases = findDriveLetters();
    if (!bases.length) { res.writeHead(500); res.end('드라이브를 못 찾음 (Drive for desktop 확인)'); return; }
    // 여러 드라이브(계정)가 있으면, 파일이 실제로 있는 드라이브 문자를 찾는다.
    console.log('── 열기 시도 ──');
    console.log('  받은 경로:', rel);
    console.log('  후보 드라이브:', bases.join(' | '));
    let full = null;
    for (const base of bases) {
      const cand = path.join(base, rel);
      if (fs.existsSync(cand)) { full = cand; break; }
    }
    if (!full) {
      console.log('  결과: ❌ 어느 드라이브에서도 파일 없음');
      for (const base of bases) {
        try { console.log('  · ' + base + ' 안 항목:', fs.readdirSync(base).slice(0, 30).join(' | ')); } catch (_) {}
      }
      res.writeHead(404); res.end('파일 없음 (후보: ' + bases.map(b => path.join(b, rel)).join(' , ') + ')'); return;
    }
    console.log('  찾음:', full, '→ 한글로 엽니다');
    try {
      // 연결 프로그램(한글)으로 열기 — start "" "경로"
      spawn('cmd', ['/c', 'start', '""', `"${full}"`], { windowsVerbatimArguments: true, stdio: 'ignore' });
      console.log('열기:', full);
      res.writeHead(200); res.end('opening');
    } catch (e) {
      console.error('실행 실패:', e.message);
      res.writeHead(500); res.end('실행 실패: ' + e.message);
    }
    return;
  }

  res.writeHead(404); res.end();
}).listen(PORT, '127.0.0.1', () => {
  const bases = findDriveLetters();
  console.log('==============================================');
  console.log(' 한글 열기 도우미 실행 중 — http://127.0.0.1:' + PORT);
  console.log(' 드라이브:', bases.length ? bases.join(' | ') : '(못 찾음 — Drive for desktop 확인)');
  console.log(' 이 창을 열어둔 채로 웹앱에서 "한글로 편집"을 누르세요.');
  console.log('==============================================');
});
