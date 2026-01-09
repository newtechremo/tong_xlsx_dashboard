#!/bin/bash
#
# 서버에 data_repository 업로드 스크립트
# 사용법: ./scripts/sync-data.sh
#

# 설정
SERVER_HOST="49.168.236.221"
SERVER_PORT="6201"
SERVER_USER="finefit-temp"
SERVER_PATH="/home/finefit-temp/Desktop/project/tong_xlsx_dashboard"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "  데이터 파일 서버 업로드 스크립트"
echo "========================================="
echo ""

# 프로젝트 루트로 이동 (스크립트 위치 기준)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# data_repository 확인
if [ ! -d "data_repository" ]; then
    echo -e "${RED}ERROR: data_repository 폴더가 없습니다.${NC}"
    echo "현재 위치: $(pwd)"
    exit 1
fi

# 파일 개수 확인
FILE_COUNT=$(find data_repository -type f | wc -l)
echo -e "업로드할 파일 수: ${GREEN}${FILE_COUNT}개${NC}"
echo ""

# 확인
read -p "서버에 업로드하시겠습니까? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "취소되었습니다."
    exit 0
fi

echo ""
echo "업로드 중..."
echo -e "${YELLOW}비밀번호를 입력하세요: remo1234!${NC}"
echo ""

# SCP 업로드
scp -P $SERVER_PORT -r ./data_repository $SERVER_USER@$SERVER_HOST:$SERVER_PATH/

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}  업로드 완료!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "다음 단계:"
    echo "1. GitHub Actions에서 'Initialize Server' 워크플로우 실행"
    echo "   또는"
    echo "2. GitHub Actions에서 'Deploy to Server' 워크플로우 실행 (run_etl=yes)"
else
    echo ""
    echo -e "${RED}업로드 실패. 네트워크 연결 및 비밀번호를 확인하세요.${NC}"
    exit 1
fi
