@echo off
chcp 65001 >nul
title 한글 열기 도우미 설치
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
echo.
echo  한글 열기 도우미를 설치합니다...
> "%STARTUP%\hwp-opener.vbs" echo CreateObject("WScript.Shell").Run "node ""%~dp0server.js""", 0, False
start "" wscript "%STARTUP%\hwp-opener.vbs"
echo.
echo  설치 완료! 이제부터 컴퓨터를 켜면 도우미가 자동으로 켜집니다.
echo  웹에서 "한글로 편집" 버튼만 누르면 됩니다.
echo.
pause
