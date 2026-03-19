#!/bin/bash
# 篮球青训系统一键部署脚本
# 使用方法：复制全部内容，粘贴到VNC终端，按回车执行

echo "===== 开始部署篮球青训系统 ====="

# 1. 更新系统并安装Node.js
echo "[1/6] 安装环境..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - 2>/dev/null
sudo apt-get install -y nodejs git 2>/dev/null
node -v && npm -v

# 2. 安装Nginx和PM2
echo "[2/6] 安装Nginx和PM2..."
sudo apt-get install -y nginx 2>/dev/null
sudo npm install -g pm2 2>/dev/null

# 3. 创建项目目录
echo "[3/6] 创建项目目录..."
cd /var/www 2>/dev/null || cd ~
sudo mkdir -p basketball-coach
cd basketball-coach
sudo chown $USER:$USER basketball-coach 2>/dev/null

# 4. 上传代码（需要你先把代码上传到服务器）
# 这里用占位符，你可以用以下方式上传：
# - git clone <你的仓库>
# - scp -r <本地代码> ubuntu@server:/var/www/basketball-coach/
# - 使用腾讯云的文件上传功能
echo "[4/6] 请上传代码到 /var/www/basketball-coach"
echo "上传方式："
echo "  1. Git: git clone <仓库地址> ."
echo "  2. SCP: scp -r ./basketball-coach ubuntu@62.234.79.188:/var/www/"
echo "  3. 手动: 在VNC终端里rz/sz或winscp上传"

# 5. 安装依赖和构建
echo "[5/6] 安装依赖..."
npm install 2>/dev/null

# 6. 配置并启动
echo "[6/6] 配置环境变量..."
echo 'NEXT_PUBLIC_KIMI_API_KEY=sk-your-new-key-here' > .env.local
npm run build 2>/dev/null

# 用PM2启动
pm2 start npm --name "basketball-coach" -- start
pm2 save
pm2 startup

# 配置Nginx反向代理
sudo tee /etc/nginx/sites-available/basketball-coach > /dev/null <<'NGINX'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/basketball-coach /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "===== 部署完成 ====="
echo "访问 http://62.234.79.188:3000"
pm2 list