# 开发测试部署最佳实践

## 核心原则

**"本地不通过，不上生产"**

```
┌─────────────────────────────────────────────────────────────┐
│  开发环境 (本地)  │  测试环境  │  生产环境 (服务器)          │
│        ↓         │     ↓     │         ↓                   │
│   功能开发       →   自测     →   部署                      │
│   API 调试       →   验证     →   观察                      │
│   UI 检查        →   回归     →   监控                      │
└─────────────────────────────────────────────────────────────┘
```

## 本地开发流程

### 1. 开发前准备
```bash
# 确保本地是干净的开发环境
git checkout main
git pull origin main
npm install
```

### 2. 开发中自测
- [ ] 功能代码写完
- [ ] `npm run build` 编译通过
- [ ] `npm run dev` 本地运行正常
- [ ] 关键功能手动测试通过

### 3. 部署前检查清单
```bash
# 在本地执行以下检查：

# 1. 编译检查
npm run build

# 2. 类型检查
npm run lint

# 3. 启动生产模式测试
npm run start
# 访问 http://localhost:3000 验证

# 4. 测试关键 API
curl -X POST http://localhost:3000/api/xxx -d '{}'
```

### 4. 部署命令
```bash
git add .
git commit -m "feat: xxx"
git push origin main
# GitHub Actions 或服务器 webhook 自动部署
```

### 5. 部署后验证
```bash
# SSH 到服务器检查
pm2 list
curl http://localhost:3000  # 验证响应
```

---

## 项目结构建议

```
basketball-coach/
├── .env.local          # 本地环境变量 (仅开发用)
├── .env.production     # 生产环境变量 (不上传 Git)
├── ecosystem.config.js # PM2 配置
├── docker-compose.yml  # 可选：容器化部署
└── deploy.sh           # 一键部署脚本
```

## 环境变量管理

### 禁止的做法
```javascript
// ❌ 前端代码直接使用 API Key
const API_KEY = process.env.NEXT_PUBLIC_MINIMAX_API_KEY
fetch('https://api.minimax.chat/...') // CORS 失败！
```

### 正确的做法
```javascript
// ✅ 前端调用同域 API
const response = await fetch('/api/generate-plan', { ... })

// ✅ 服务端 API 路由调用外部服务
// src/app/api/generate-plan/route.ts
const API_KEY = process.env.MY_API_KEY // 服务端环境变量
fetch('https://external-api.com/...', { headers: { Authorization: `Bearer ${API_KEY}` } })
```

## PM2 生产部署配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'basketball-coach',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/basketball-coach',
    env_production: {
      NODE_ENV: 'production',
      // 生产环境变量
      KIMI_API_KEY: process.env.KIMI_API_KEY,
    }
  }]
}
```

## 部署脚本

```bash
#!/bin/bash
# deploy.sh - 一键部署脚本

set -e

echo "===== 开始部署 ====="

cd /var/www/basketball-coach

# 1. 停止服务
pm2 stop all

# 2. 拉取代码
git pull origin main

# 3. 安装依赖
npm install

# 4. 清除缓存重新构建
rm -rf .next
npm run build

# 5. 启动服务
pm2 start ecosystem.config.js --env production

# 6. 保存配置
pm2 save

# 7. 验证
curl -s http://localhost:3000 | head -c 200

echo "===== 部署完成 ====="
```

## 快速检查清单

部署前在本地执行：

- [ ] `npm run build` 成功
- [ ] `npm run start` 能启动
- [ ] 浏览器访问 localhost:3000 正常
- [ ] 核心功能测试通过
- [ ] API 调用正常（curl 测试）
- [ ] 没有 console error

只有全部 ✓ 才 push 部署。

---

## 自动化测试（进阶）

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm test
```

---

## 常见问题处理

| 问题 | 解决方案 |
|------|----------|
| CSS/JS 缓存不更新 | `rm -rf .next` 然后重建 |
| PM2 进程僵死 | `pm2 delete all` 然后重启 |
| 端口被占用 | `pkill -f next` 杀掉残留进程 |
| 环境变量不生效 | 重启 PM2 进程 `pm2 restart all` |
| API 500 错误 | 检查服务器日志 `pm2 logs` |
