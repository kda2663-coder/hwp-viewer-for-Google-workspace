' 한글 열기 도우미 — 검은 창 없이 백그라운드 실행 (자기 폴더의 server.js를 찾아 실행)
' 자기 위치를 런타임에 OS가 찾으므로 한글 경로에서도 안전하다.
Dim here
here = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
CreateObject("WScript.Shell").Run "node """ & here & "server.js""", 0, False
