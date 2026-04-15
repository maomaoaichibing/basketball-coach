#!/bin/bash
# 篮球青训系统 - 直接部署脚本

# 服务器信息
SERVER_IP="62.234.79.188"
SERVER_USER="ubuntu"
SERVER_PASSWORD="boX123456"

# 部署目录
DEPLOY_DIR="/var/www/basketball-coach"

# 颜色输出
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"

echo -e "${GREEN}=== 开始部署篮球青训系统 ===${NC}"

# 检查sshpass
if ! command -v sshpass &> /dev/null; then
    echo -e "${RED}错误: sshpass 未安装${NC}"
    echo -e "${YELLOW}请安装 sshpass:${NC}"
    echo -e "  Mac: brew install sshpass"
    echo -e "  Linux: sudo apt-get install sshpass"
    exit 1
fi

# 连接服务器并执行部署命令
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << 'EOF'
set -e

echo "=== 服务器部署开始 ==="

# 检查目录
if [ ! -d "/var/www/basketball-coach" ]; then
    echo "创建部署目录..."
    sudo mkdir -p /var/www/basketball-coach
    sudo chown ubuntu:ubuntu /var/www/basketball-coach
fi

cd /var/www/basketball-coach

# 克隆代码
echo "克隆代码..."
git clone https://github.com/maomaoaichibing/basketball-coach.git . 2>/dev/null || git pull

# 安装依赖
echo "安装依赖..."
npm ci --production

# 运行数据库迁移
echo "运行数据库迁移..."
npx prisma migrate deploy
npx prisma generate

# 构建项目
echo "构建项目..."
npm run build

# 启动服务
echo "启动服务..."
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
pm2 save

# 检查状态
echo "检查服务状态..."
pm2 status
sleep 3

# 测试访问
echo "测试服务访问..."
curl -sI http://localhost:3000/ 2>&1 | head -5

echo "=== 服务器部署完成 ==="
EOF

echo -e "${GREEN}=== 部署完成 ===${NC}"
echo -e "${YELLOW}服务地址: http://$SERVER_IP:3000${NC}"
