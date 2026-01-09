#
# 서버에 data_repository 업로드 스크립트 (Windows PowerShell)
# 사용법: .\scripts\sync-data.ps1
#

# 설정
$SERVER_HOST = "49.168.236.221"
$SERVER_PORT = "6201"
$SERVER_USER = "finefit-temp"
$SERVER_PATH = "/home/finefit-temp/Desktop/project/tong_xlsx_dashboard"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  데이터 파일 서버 업로드 스크립트" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 프로젝트 루트로 이동 (스크립트 위치 기준)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

# data_repository 확인
if (-not (Test-Path "data_repository")) {
    Write-Host "ERROR: data_repository 폴더가 없습니다." -ForegroundColor Red
    Write-Host "현재 위치: $(Get-Location)"
    exit 1
}

# 파일 개수 확인
$FileCount = (Get-ChildItem -Path "data_repository" -Recurse -File).Count
Write-Host "업로드할 파일 수: " -NoNewline
Write-Host "$FileCount개" -ForegroundColor Green
Write-Host ""

# 확인
$confirm = Read-Host "서버에 업로드하시겠습니까? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "취소되었습니다."
    exit 0
}

Write-Host ""
Write-Host "업로드 중..."
Write-Host "비밀번호를 입력하세요: remo1234!" -ForegroundColor Yellow
Write-Host ""

# SCP 명령 실행
$scpCommand = "scp -P $SERVER_PORT -r ./data_repository ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/"

try {
    # Git Bash scp 사용 (Windows에서 OpenSSH가 없을 경우)
    $gitBashPath = "C:\Program Files\Git\usr\bin\scp.exe"
    if (Test-Path $gitBashPath) {
        & $gitBashPath -P $SERVER_PORT -r "./data_repository" "${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/"
    } else {
        # Windows 기본 scp 사용
        scp -P $SERVER_PORT -r "./data_repository" "${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/"
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host "  업로드 완료!" -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "다음 단계:"
        Write-Host "1. GitHub Actions에서 'Initialize Server' 워크플로우 실행"
        Write-Host "   또는"
        Write-Host "2. GitHub Actions에서 'Deploy to Server' 워크플로우 실행 (run_etl=yes)"
    } else {
        throw "SCP failed"
    }
} catch {
    Write-Host ""
    Write-Host "업로드 실패. 네트워크 연결 및 비밀번호를 확인하세요." -ForegroundColor Red
    Write-Host ""
    Write-Host "수동 명령어:" -ForegroundColor Yellow
    Write-Host "scp -P $SERVER_PORT -r ./data_repository ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/"
    exit 1
}
