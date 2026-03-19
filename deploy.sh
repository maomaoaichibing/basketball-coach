#!/bin/bash
# 篮球青训系统部署脚本

echo "========== 开始部署篮球青训系统 =========="

# 1. 检查环境
echo "[1/7] 检查系统环境..."
cat /etc/os-release
node -v
npm -v

# 2. 安装Git（如果需要）
echo "[2/7] 检查Git..."
git --version || apt-get update && apt-get install -y git

# 3. 创建项目目录
echo "[3/7] 创建项目目录..."
mkdir -p /var/www/basketball-coach
cd /var/www/basketball-coach

# 4. 克隆代码（需要你先上传到Git）
# echo "[4/7] 克隆代码..."
# git clone <你的代码仓库URL> .

# 或者使用wget上传（这里先用占位符）
echo "[4/7] 准备代码..."

# 5. 安装依赖
echo "[5/7] 安装Node.js依赖..."
npm install

# 6. 配置环境变量
echo "[6/7] 配置环境变量..."
echo 'NEXT_PUBLIC_KIMI_API_KEY=sk-your-new-api-key' > .env.local

# 7. 构建和启动
echo "[7/7] 构建应用..."
npm run build

echo "========== 部署完成 =========="