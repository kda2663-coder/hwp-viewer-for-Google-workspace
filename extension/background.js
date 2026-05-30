// 한글 드라이브 편집기 — 확장 백그라운드(서비스 워커)
// 역할: 웹앱(hwp-drive-sync.web.app)의 요청을 받아 구글 드라이브에서 파일을 읽고/쓴다.
// 인증은 chrome.identity 로 처리 → 브라우저 팝업 차단 없음.

// 웹앱(외부 페이지)에서 오는 메시지 처리
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  if (msg && msg.cmd === 'ping') {
    sendResponse({ ok: true });
    return;
  }
  if (msg && msg.cmd === 'download') {
    handleDownload(msg.fileId)
      .then(sendResponse)
      .catch((e) => sendResponse({ error: e.message }));
    return true; // 비동기 응답
  }
  if (msg && msg.cmd === 'upload') {
    handleUpload(msg.fileId, msg.bytes)
      .then(sendResponse)
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }
});

// OAuth 토큰 얻기
function getToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message || '토큰을 받지 못했어요'));
        return;
      }
      resolve(token);
    });
  });
}

// 드라이브에서 파일 이름 + 내용 다운로드
async function handleDownload(fileId) {
  const token = await getToken(true);
  const metaResp = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name&supportsAllDrives=true`,
    { headers: { Authorization: 'Bearer ' + token } }
  );
  if (!metaResp.ok) throw new Error('파일 정보 실패: ' + metaResp.status);
  const meta = await metaResp.json();

  const dataResp = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: 'Bearer ' + token } }
  );
  if (!dataResp.ok) throw new Error('다운로드 실패: ' + dataResp.status);
  const buf = await dataResp.arrayBuffer();

  // 메시지로 바이트 전달 시 ArrayBuffer 는 직렬화가 안 돼 → 일반 배열로 변환
  return { name: meta.name, bytes: Array.from(new Uint8Array(buf)) };
}

// 편집된 내용을 드라이브 원본에 덮어쓰기
async function handleUpload(fileId, bytesArr) {
  const token = await getToken(true);
  const body = new Uint8Array(bytesArr);
  const resp = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&supportsAllDrives=true`,
    {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/octet-stream' },
      body,
    }
  );
  if (!resp.ok) throw new Error('저장 실패: ' + resp.status);
  return { ok: true };
}
