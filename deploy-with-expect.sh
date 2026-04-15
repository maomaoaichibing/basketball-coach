#!/bin/bash
# 篮球青训系统 - 使用expect部署脚本

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

# 检查expect
if ! command -v expect &> /dev/null; then
    echo -e "${RED}错误: expect 未安装${NC}"
    echo -e "${YELLOW}请安装 expect:${NC}"
    echo -e "  Mac: brew install expect"
    echo -e "  Linux: sudo apt-get install expect"
    exit 1
fi

# 创建expect脚本
cat > deploy.exp << 'EOF'
#!/usr/bin/expect -f

set server_ip "62.234.79.188"
set server_user "ubuntu"
set server_password "boX123456"

spawn ssh -o StrictHostKeyChecking=no $server_user@$server_ip

expect "password:"
send "$server_password\r"

expect "$"
send "cd /var/www/basketball-coach\r"

expect "$"
send "echo '=== 开始部署 ==='\r"

expect "$"
send "git pull\r"

expect "$"
send "npx prisma db push\r"

expect "$"
send "npx prisma generate\r"

expect "$"
send "rm -rf .next\r"

expect "$"
send "npm run build\r"

expect "$"
send "pm2 restart basketball-coach\r"

expect "$"
send "pm2 save\r"

expect "$"
send "pm2 status\r"

expect "$"
send "curl -sI http://localhost:3000/ | head -5\r"

expect "$"
send "echo '=== 部署完成 ==='\r"

expect "$"
send "exit\r"

expect eof
EOF

# 执行expect脚本
chmod +x deploy.exp
echo -e "${YELLOW}执行部署脚本...${NC}"
expect deploy.exp

# 清理临时文件
rm deploy.exp

echo -e "${GREEN}=== 部署完成 ===${NC}"
echo -e "${YELLOW}服务地址: http://$SERVER_IP:3000${NC}"
