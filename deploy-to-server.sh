#!/bin/bash
# 篮球青训系统部署脚本 - 直接部署到服务器

echo "========== 开始部署篮球青训系统 =========="

# 服务器信息
SERVER_IP="62.234.79.188"
SERVER_USER="ubuntu"
SERVER_PASSWORD="boX123456"
DEPLOY_PATH="/var/www/basketball-coach"

# 检查sshpass是否安装
if ! command -v sshpass &> /dev/null; then
    echo "[ERROR] sshpass 未安装，正在安装..."
    if [[ "$(uname)" == "Darwin" ]]; then
        brew install sshpass
    elif [[ "$(uname)" == "Linux" ]]; then
        sudo apt-get install -y sshpass
    else
        echo "[ERROR] 不支持的操作系统"
        exit 1
    fi
fi

# 1. 检查环境
echo "[1/7] 检查本地环境..."
node -v
npm -v

# 2. 构建项目
echo "[2/7] 构建项目..."
npm run build

# 3. 创建部署目录
echo "[3/7] 创建服务器部署目录..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "sudo mkdir -p $DEPLOY_PATH"

# 4. 复制文件到服务器
echo "[4/7] 复制文件到服务器..."
sshpass -p "$SERVER_PASSWORD" rsync -avz --delete \
  -e "ssh -o StrictHostKeyChecking=no" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next/cache' \
  . $SERVER_USER@$SERVER_IP:$DEPLOY_PATH

# 5. 运行部署命令
echo "[5/7] 运行服务器部署命令..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << 'EOF'
  cd /var/www/basketball-coach
  
  # 设置权限
  sudo chown -R $USER:$USER .
  
  # 安装依赖
  echo "📦 安装依赖..."
  npm ci --production
  
  # 运行数据库迁移
  echo "🗄️ 运行数据库迁移..."
  npx prisma migrate deploy
  npx prisma generate
  
  # 构建应用
  echo "🔨 构建应用..."
  npm run build
  
  # 启动或重启应用
  echo "🔄 启动应用..."
  pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
  
  # 保存 PM2 配置
  pm2 save
  
  echo "✅ 部署完成！"
EOF

# 6. 检查部署状态
echo "[6/7] 检查部署状态..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "pm2 status"

# 7. 完成部署
echo "[7/7] 部署完成！"
echo "🌐 应用访问地址: http://$SERVER_IP:3000"
echo "========== 部署完成 =========="
