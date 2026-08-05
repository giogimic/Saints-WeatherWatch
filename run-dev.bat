@echo off
setlocal
set "ROOT=%~dp0"

call "%ROOT%install-deps.bat"

start "Saints Weather Watch Backend" cmd /k "cd /d "%ROOT%backend" && set DATABASE_URL=file:../data/weatherwatch.db && go run github.com/steebchen/prisma-client-go db push --schema prisma/schema.prisma && set DATABASE_URL=file:./data/weatherwatch.db && go run ./cmd/server"
start "Saints Weather Watch Frontend" cmd /k "cd /d "%ROOT%frontend" && npm start"

echo.
echo Saints Weather Watch dev servers launched.
echo Backend: http://localhost:8080/api/health
echo Frontend: http://localhost:4200
endlocal
