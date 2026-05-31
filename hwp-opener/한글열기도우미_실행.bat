@echo off
chcp 65001 >nul
title 한글 열기 도우미
echo 한글 열기 도우미를 시작합니다...
node --experimental-sqlite --no-warnings "%~dp0server.js"
echo.
echo [도우미가 종료되었습니다]
pause
