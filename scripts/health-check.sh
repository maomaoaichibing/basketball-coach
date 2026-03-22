#!/bin/bash
# 部署健康检查脚本
# 用法: ./scripts/health-check.sh [server] [port]

set -e

SERVER="${1:-62.234.79.188}"
PORT="${2:-3000}"
PROJECT="basketball-coach"

echo "=========================================="
echo " 篮球教练系统健康检查"
echo " 服务器: $SERVER:$PORT"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

check_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo "=== 1. PM2 进程状态 ==="
STATUS=$(ssh root@$SERVER "pm2 status $PROJECT 2>/dev/null | grep $PROJECT" || echo "")
if [[ -n "$STATUS" ]]; then
    check_pass "PM2 进程运行中"
    echo "$STATUS" | awk '{print "  状态:", $10, "| 运行时间:", $6}'
else
    check_fail "PM2 进程未找到"
fi
echo ""

echo "=== 2. HTTP 响应检查 ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER:$PORT/ --max-time 10)
if [[ "$HTTP_CODE" == "200" ]]; then
    check_pass "首页返回 200"
else
    check_fail "首页返回 $HTTP_CODE"
fi
echo ""

echo "=== 3. RAG 数据检查 ==="
DEBUG_JSON=$(curl -s -X POST http://$SERVER:$PORT/api/generate-plan \
    -H "Content-Type: application/json" \
    -d '{"group":"U10","duration":60,"theme":"运球","focusSkills":["运球"],"debug":true}' \
    --max-time 30 2>/dev/null)

TOTAL=$(echo "$DEBUG_JSON" | jq -r '.debug.totalPlansInDb // empty' 2>/dev/null)
CASES=$(echo "$DEBUG_JSON" | jq -r '.debug.retrievedCases | length // empty' 2>/dev/null)

if [[ -n "$TOTAL" && "$TOTAL" -gt 0 ]]; then
    check_pass "RAG 数据已加载: $TOTAL 条"
else
    check_fail "RAG 数据未加载"
fi

if [[ -n "$CASES" && "$CASES" -gt 0 ]]; then
    check_pass "检索成功: 找到 $CASES 条相关案例"
else
    check_warn "检索返回 0 条案例"
fi
echo ""

echo "=== 4. 球员 API 检查 ==="
PLAYERS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER:$PORT/api/players --max-time 10)
if [[ "$PLAYERS_CODE" == "200" ]]; then
    check_pass "球员 API 返回 200"
else
    check_warn "球员 API 返回 $PLAYERS_CODE"
fi
echo ""

echo "=== 5. 最近日志检查 ==="
ssh root@$SERVER "pm2 logs $PROJECT --lines 20 --nostream 2>/dev/null" | tail -10 | while read line; do
    echo "  $line"
done
echo ""

echo "=========================================="
echo " 健康检查完成"
echo "=========================================="
