#!/bin/bash
#
# 서버에 데이터 파일 업로드 스크립트
# 사용법: ./scripts/sync-data.sh
#

# ===== 설정 (프로젝트에 맞게 수정) =====
SERVER_HOST="49.168.236.221"
SERVER_PORT="6201"
SERVER_USER="finefit-temp"
SERVER_PATH="/home/finefit-temp/Desktop/project/tong_xlsx_dashboard"

# 업로드할 파일/폴더 목록
UPLOAD_ITEMS=(
    "data_repository"
    "backend/database/safety.db"
)
# ========================================

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "  데이터 파일 서버 업로드 스크립트"
echo "========================================="
echo ""

# 프로젝트 루트로 이동
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# 업로드할 항목 확인
echo "업로드할 항목:"
for item in "${UPLOAD_ITEMS[@]}"; do
    if [ -e "$item" ]; then
        echo -e "  ${GREEN}✓${NC} $item"
    else
        echo -e "  ${RED}✗${NC} $item (없음)"
    fi
done
echo ""

# 확인
read -p "서버에 업로드하시겠습니까? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "취소되었습니다."
    exit 0
fi

echo ""
echo -e "${YELLOW}비밀번호: remo1234!${NC}"
echo ""

# SCP 업로드
for item in "${UPLOAD_ITEMS[@]}"; do
    if [ -e "$item" ]; then
        echo "업로드 중: $item"
        scp -P $SERVER_PORT -r "./$item" $SERVER_USER@$SERVER_HOST:$SERVER_PATH/
    fi
done

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  업로드 완료!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "다음 단계: Deploy to Server 워크플로우 실행"
