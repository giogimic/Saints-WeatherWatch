@echo off
setlocal
set "ROOT=%~dp0"

cd /d "%ROOT%backend"
if not exist .env (
    copy .env.example .env >nul
)

go mod download
if exist "go.mod" (
    go run github.com/steebchen/prisma-client-go db push
)

cd /d "%ROOT%frontend"
call npm install

endlocal
echo.
echo Dependency install complete.
echo Backend: go mod download + Prisma push
echo Frontend: npm install
