// 한글 드라이브 뷰어 — 콘텐츠 스크립트
// 드라이브에서 hwp 파일을 클릭하면 화면에 "한글로 보기" 링크를 띄우고,
// 누르면 그 파일을 우리 웹앱 뷰어로 연다. (목록은 건드리지 않음)

(function () {
  const WEBAPP = 'https://hwp-drive-sync.web.app/';
  const RE = /^[A-Za-z0-9_-]{20,}$/;

  function editorUrl(id) {
    // 웹앱에 파일 ID만 넘김 — 로그인·다운로드는 웹앱이 처리 (확장 ID와 무관)
    return WEBAPP + '?source=ext&fileId=' + encodeURIComponent(id);
  }

  // 고정 버튼을 진짜 링크(<a>)로 만든다 → 네이티브 새 탭 열기(팝업 차단·클릭충돌 없음)
  const btn = document.createElement('a');
  btn.id = 'hwp-edit-btn';
  btn.textContent = '📄 한글로 보기';
  btn.target = '_blank';
  btn.rel = 'noopener';
  btn.href = '#';
  btn.style.cssText = [
    'position:fixed', 'top:80px', 'right:250px', 'z-index:2147483647', 'display:none',
    'background:#fff', 'color:#3c4043', 'border:1px solid #dadce0', 'border-radius:8px',
    'padding:8px 14px', 'font-size:13px', 'font-weight:600', 'cursor:pointer',
    'text-decoration:none', 'box-shadow:0 1px 3px rgba(60,64,67,.3)',
    'font-family:"맑은 고딕",sans-serif'
  ].join(';');
  (document.body || document.documentElement).appendChild(btn);

  // 클릭 감지 (캡처 단계)
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('#hwp-edit-btn')) return; // 우리 링크 클릭은 그대로 진행
    const el = e.target && e.target.closest ? e.target.closest('[data-id]') : null;
    const id = el && el.getAttribute('data-id');
    if (id && RE.test(id) && /\.hwpx?/i.test(el.textContent || '')) {
      btn.href = editorUrl(id);   // hwp 파일 클릭 → 링크 주소 설정 + 표시
      btn.style.display = 'block';
    } else {
      btn.style.display = 'none';  // hwp 아닌 곳 클릭 → 숨김
    }
  }, true);
})();
