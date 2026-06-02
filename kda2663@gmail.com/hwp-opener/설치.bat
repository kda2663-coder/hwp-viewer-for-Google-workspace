@echo off
chcp 65001 >nul
title 한글 열기 도우미 설치
set "VBS=%~dp0run-hidden.vbs"
echo.
echo  한글 열기 도우미를 설치합니다...
echo.
rem 시작프로그램에 "run-hidden.vbs 실행" 바로가기 생성 (경로를 텍스트로 안 적어 한글경로 안전)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$q=[char]34; $ws=New-Object -ComObject WScript.Shell; $lnk=$env:APPDATA+'\Microsoft\Windows\Start Menu\Programs\Startup\hwp-opener.lnk'; $sc=$ws.CreateShortcut($lnk); $sc.TargetPath='wscript.exe'; $sc.Arguments=$q+$env:VBS+$q; $sc.Save()"
rem 지금 바로 실행 (검은 창 없이)
start "" wscript "%VBS%"
echo  설치 완료! 이제부터 컴퓨터를 켜면 도우미가 자동으로 켜집니다.
echo  웹에서 "한글로 편집" 버튼만 누르면 됩니다.
echo.
echo  ※ 이 폴더는 지우거나 옮기지 마세요. (도우미가 이 위치를 사용합니다)
echo     옮겼다면 옮긴 위치에서 설치.bat 을 다시 한 번 실행하세요.
echo.
pause
