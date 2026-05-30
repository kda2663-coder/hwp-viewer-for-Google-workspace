// 한글 드라이브 편집기 — 콘텐츠 스크립트
// 드라이브에서 hwp 파일을 클릭하면 화면에 "한글로 열기" 버튼을 띄우고,
// 누르면 그 파일을 우리 편집기(웹앱)로 연다. (목록은 건드리지 않음)

(function () {
  const WEBAPP = 'https://hwp-drive-sync.web.app/';
  const RE = /^[A-Za-z0-9_-]{20,}$/;
  let currentId = null;

  function openEditor(id) {
    window.open(
      WEBAPP + '?source=ext&fileId=' + encodeURIComponent(id) +
      '&extId=' + encodeURIComponent(chrome.runtime.id),
      '_blank'
    );
  }

  // 고정 버튼 (평소 숨김, hwp 클릭하면 표시)
  const btn = document.createElement('button');
  btn.id = 'hwp-edit-btn';
  btn.textContent = '📄 한글로 열기';
  btn.style.cssText = [
    'position:fixed', 'top:80px', 'right:250px', 'z-index:2147483647', 'display:none',
    'background:#fff', 'color:#3c4043', 'border:1px solid #dadce0', 'border-radius:8px',
    'padding:8px 14px', 'font-size:13px', 'font-weight:600', 'cursor:pointer',
    'box-shadow:0 1px 3px rgba(60,64,67,.3)', 'font-family:"맑은 고딕",sans-serif'
  ].join(';');
  btn.addEventListener('click', () => { if (currentId) openEditor(currentId); });
  (document.body || document.documentElement).appendChild(btn);

  // 클릭 감지 (캡처 단계)
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('#hwp-edit-btn')) return; // 우리 버튼 클릭은 제외
    const el = e.target && e.target.closest ? e.target.closest('[data-id]') : null;
    const id = el && el.getAttribute('data-id');
    if (id && RE.test(id) && /\.hwpx?/i.test(el.textContent || '')) {
      currentId = id;            // hwp 파일 클릭 → 기억 + 버튼 표시
      btn.style.display = 'block';
    } else {
      currentId = null;          // hwp 아닌 곳 클릭 → 버튼 숨김
      btn.style.display = 'none';
    }
  }, true);
})();
