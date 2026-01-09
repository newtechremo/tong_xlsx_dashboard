#
# 서버에 데이터 파일 업로드 스크립트 (Windows PowerShell)
# 사용법: .\scripts\sync-data.ps1
#

# ===== 설정 (프로젝트에 맞게 수정) =====
$SERVER_HOST = "49.168.236.221"
$SERVER_PORT = "6201"
$SERVER_USER = "finefit-temp"
$SERVER_PATH = "/home/finefit-temp/Desktop/project/tong_xlsx_dashboard"

# 업로드할 파일/폴더 목록
$UPLOAD_ITEMS = @(
    "data_repository"
    "backend/database/safety.db"
)
# ========================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  데이터 파일 서버 업로드 스크립트" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 프로젝트 루트로 이동
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

# 업로드할 항목 확인
Write-Host "업로드할 항목:"
foreach ($item in $UPLOAD_ITEMS) {
    if (Test-Path $item) {
        Write-Host "  ✓ $item" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $item (없음)" -ForegroundColor Red
    }
}
Write-Host ""

# 확인
$confirm = Read-Host "서버에 업로드하시겠습니까? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "취소되었습니다."
    exit 0
}

Write-Host ""
Write-Host "비밀번호: remo1234!" -ForegroundColor Yellow
Write-Host ""

# SCP 업로드
foreach ($item in $UPLOAD_ITEMS) {
    if (Test-Path $item) {
        Write-Host "업로드 중: $item"
        scp -P $SERVER_PORT -r "./$item" "${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/"
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  업로드 완료!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "다음 단계: Deploy to Server 워크플로우 실행"
