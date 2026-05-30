@echo off
chcp 65001 >nul
title 한글 열기 도우미 제거
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
del "%STARTUP%\hwp-opener.vbs" 2>nul
echo.
echo  제거 완료. (지금 켜져 있는 도우미는 컴퓨터를 다시 켜면 사라집니다)
echo.
pause
