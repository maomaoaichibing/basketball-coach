#!/bin/bash
# ============================================================
# 篮球青训系统 v5.14.0 — 全自动一键部署脚本
# 
# 方案: Git 仓库 + SSH 远程 pull & build（与珍珠项目完全一致）
# 
# 使用方法:
#   本地一键执行:  bash deploy-basketball.sh
#   分步执行:      bash deploy-basketball.sh [push|deploy|restart|verify|all]
#
# 前提条件:
#   1. 服务器已安装 Node.js 18+ / PM2
#   2. 服务器上已创建 /var/www/basketball-coach 目录
# ============================================================

set -e

# === 配置 ===
REMOTE_HOST="ubuntu@62.234.79.188"
REMOTE_DIR="/var/www/basketball-coach"
PORT=3000
APP_NAME="basketball-coach"
SSH_PASS="boX123456"

SSH="sshpass -p '$SSH_PASS' ssh -o StrictHostKeyChecking=no $REMOTE_HOST"

# 颜色输出
R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'; C='\033[0;36m'; N='\033[0m'
log()  { echo -e "${C}[$(date +%H:%M:%S)]${N} $1"; }
ok()   { echo -e "${G}✅ $1${N}"; }
warn() { echo -e "${Y}⚠️  $1${N}"; }
err()  { echo -e "${R}❌ $1${N}"; }

# ============================================================
# Step 0: 首次初始化服务器环境
# ============================================================
step_init() {
  log "🔧 Step 0: 首次初始化服务器环境 ..."
  
  $SSH bash -s <<'INIT_SCRIPT'
set -e
echo "--- 系统信息 ---"
cat /etc/os-release | head -3

echo "--- 检查 Node.js ---"
node --version 2>/dev/null || {
  echo "安装 Node.js 18..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
}
node --version

echo "--- 检查 PM2 ---"
pm2 --version 2>/dev/null || sudo npm install -g pm2
pm2 --version

echo "--- 创建项目目录 ---"
sudo mkdir -p /var/www/basketball-coach
sudo chown ubuntu:ubuntu /var/www/basketball-coach

echo "--- Git 安全目录配置 ---"
sudo git config --global --add safe.directory '*'

# 安装 rsync（用于代码同步）
rsync --version >/dev/null 2>&1 || sudo apt-get install -y rsync

echo "=== 服务器环境就绪 ==="
INIT_SCRIPT
  
  ok "服务器环境初始化完成"
  log "接下来请执行: bash deploy-basketball.sh push   (首次需要手动 clone 或 scp 上传代码)"
}

# ============================================================
# Step 1: 本地 git push
# ============================================================
step_push() {
  log "📤 Step 1: 本地 Git 提交 & 推送 ..."
  
  cd "$(dirname "$0")"
  
  # 检查是否有未提交的更改
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    log "发现未提交的更改，自动提交..."
    git add -A
    git commit -m "Basketball Coach v5.14.0 — 优化代码结构和性能 $(date '+%Y-%m-%d %H:%M')" || true
  fi
  
  # 推送
  git push origin main 2>/dev/null || git push origin master 2>/dev/null || {
    warn "Git push 失败（可能没有远程仓库），改用 rsync 同步..."
    step_rsync
    return
  }
  
  ok "代码已推送到远程仓库"
}

# ============================================================
# Step 1c: 服务器直接从 GitHub 克隆（首次部署用）
# ============================================================
step_clone() {
  log "📦 Step 1c: 服务器直接从 GitHub 克隆代码 ..."
  
  $SSH bash -s <<'CLONE_SCRIPT'
set -e
cd /var/www

# 清理旧目录
rm -rf basketball-coach

# 克隆仓库
echo "克隆 GitHub 仓库..."
git clone https://github.com/maomaoaichibing/basketball-coach.git

cd basketball-coach
echo "克隆完成，当前版本:"
git log --oneline -1
CLONE_SCRIPT
  
  ok "GitHub 克隆完成"
}

# ============================================================
# Step 1b: rsync 备选方案（无Git时用）
# ============================================================
step_rsync() {
  log "📦 Step 1b: rsync 直接同步代码到服务器 ..."
  
  local LOCAL_PATH="$(cd "$(dirname "$0")" && pwd)"
  
  sshpass -p "$SSH_PASS" rsync -avz --delete \
    --exclude 'node_modules/' \
    --exclude '.next/' \
    --exclude '__tests__/' \
    --exclude '*.log' \
    --exclude '.git/' \
    -e "ssh -o StrictHostKeyChecking=no" \
    "$LOCAL_PATH/" "$REMOTE_HOST:$REMOTE_DIR/"
  
  ok "代码同步完成 (rsync)"
}

# ============================================================
# Step 2: 远程构建（git pull + npm install + build）
# ============================================================
step_deploy() {
  log "🔨 Step 2: 远程拉取代码 & 构建 ..."
  
  $SSH bash -s <<'DEPLOY_SCRIPT'
set -e
cd /var/www/basketball-coach

echo "[1/4] 拉取最新代码..."
git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || echo "(非git仓库，跳过pull)"

echo "[2/4] 清理旧构建..."
rm -rf .next

echo "[3/4] 安装依赖..."
npm ci --production 2>&1 | tail -3

echo "[4/4] 运行数据库迁移..."
npx prisma migrate deploy 2>&1 | tail -5
npx prisma generate 2>&1 | tail -3

echo "[5/4] Next.js 构建..."
npm run build 2>&1 | tail -30

echo "=== 构建成功 ==="
DEPLOY_SCRIPT
  
  ok "远程构建完成"
}

# ============================================================
# Step 3: PM2 重启（使用 ecosystem.config.js）
# ============================================================
step_restart() {
  log "🚀 Step 3: PM2 重启服务 ..."
  
  $SSH bash -s <<'RESTART_SCRIPT'
cd /var/www/basketball-coach

# 停止旧进程
pm2 stop basketball-coach 2>/dev/null || true
pm2 delete basketball-coach 2>/dev/null || true

# 使用 ecosystem.config.js 启动
pm2 start ecosystem.config.js

pm2 save 2>&1 | tail -2

echo ""
echo "=== PM2 进程状态 ==="
pm2 list | grep -E "basketball|Name|Status"

echo ""
echo "=== 验证端口 ==="
sleep 2
curl -sI http://localhost:3000/ 2>&1 | head -5
RESTART_SCRIPT
  
  ok "PM2 重启完成"
}

# ============================================================
# Step 4: 验证部署结果
# ============================================================
step_verify() {
  log "🔍 Step 4: 验证部署结果 ..."
  
  sleep 3
  
  # 远程检查 PM2 状态
  $SSH bash -s <<'VERIFY_SCRIPT'
echo "--- PM2 状态 ---"
pm2 list | grep -E "basketball|Name|status|uptime"

echo ""
echo "--- 最近日志 ---"
pm2 logs basketball-coach --lines 10 --nostream 2>/dev/null || true
VERIFY_SCRIPT
  
  # 本地 HTTP 检查
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://62.234.79.188:$PORT/" --connect-timeout 10 2>/dev/null || echo "000")
  
  echo ""
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "308" ]; then
    ok "篮球青训系统 在线 ✅  HTTP $HTTP_CODE"
    ok "📍 访问地址: http://62.234.79.188:$PORT"
  else
    warn "HTTP $HTTP_CODE — 服务可能在启动中，稍后再试"
    warn "日志命令: $SSH 'pm2 logs basketball-coach --lines 50'"
  fi
}

# ============================================================
# Main 入口
# ============================================================
case "${1:-all}" in
  init)    step_init ;;
  clone)   step_clone ;;
  push)    step_push ;;
  rsync)   step_rsync ;;
  deploy)  step_deploy ;;
  restart) step_restart ;;
  verify)  step_verify ;;
  all) 
    echo "========================================="
    echo "  🧪 篮球青训系统 v5.13.0 全自动部署"
    echo "========================================="
    echo ""
    step_push
    step_deploy
    step_restart
    step_verify
    echo ""
    ok "全部完成! 🎉"
    ;;
  *)
    echo "用法: bash deploy-basketball.sh [命令]"
    echo ""
    echo "命令:"
    echo "  init     首次初始化服务器环境（Node.js/PM2/目录）"
    echo "  clone    从 GitHub 克隆代码到服务器（首次部署用）"
    echo "  push     本地 git push（或自动 fallback 到 rsync）"
    echo "  rsync    用 rsync 直接同步代码到服务器"
    echo "  deploy   远程 git pull + npm install + build"
    echo "  restart  PM2 重启服务"
    echo "  verify   验证部署结果（PM2状态+HTTP检查）"
    echo "  all      完整流程：push → deploy → restart → verify（默认）"
    exit 1
    ;;
esac
