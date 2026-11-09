@echo off
title Run UI/UX Factors

@REM # 1. Cài đặt các dependencies
@REM npm install

@REM # 2. Chạy ứng dụng ở chế độ phát triển (http://localhost:5173)
@REM npm run dev

@REM # 3. Lint code
@REM npm run lint

@REM # 4. Build cho sản xuất
@REM npm run build

@REM # 5. Xem trước bản build
@REM npm run preview

echo Starting install dependencies

start cmd /k "npm install && npm audit fix --force && npm run build && npm run dev "

echo Completed !!!!

start http://localhost:5173/

start cmd /k "ping http://localhost:5173/ -i 10"


pause