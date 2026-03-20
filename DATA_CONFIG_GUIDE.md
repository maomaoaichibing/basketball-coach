# 篮球青训教案系统 - 外部数据配置指南

## 概述

系统支持通过外部配置文件管理教案数据，**更新数据不需要重新部署代码**。

## 架构

```
┌─────────────────────────────────────────────────────┐
│                    Next.js 应用                      │
│  ┌─────────────────────────────────────────────┐   │
│  │  src/lib/cases.ts                           │   │
│  │  - 检查 LESSON_PLANS_PATH 环境变量           │   │
│  │  - 如果存在，从外部文件加载数据               │   │
│  │  - 如果不存在，使用内置默认数据              │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                     │ 环境变量
                     ▼
┌─────────────────────────────────────────────────────┐
│              /var/www/basketball-coach-data/        │
│                  (服务器外部目录)                      │
│  ┌─────────────────────────────────────────────┐   │
│  │  lesson_plans_raw.json  (教案数据)           │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## 使用方法

### 1. 上传数据文件到服务器

```bash
# 在服务器上创建目录
mkdir -p /var/www/basketball-coach-data

# 上传 lesson_plans_raw.json 到该目录
# 可以使用 scp、rsync 或其他方式上传
scp lesson_plans_raw.json root@62.234.79.188:/var/www/basketball-coach-data/
```

### 2. 配置 PM2 环境变量

```bash
# 方法一：使用 pm2 set 命令
pm2 set basketball-coach env.LESSON_PLANS_PATH /var/www/basketball-coach-data/lesson_plans_raw.json

# 方法二：编辑 ecosystem.config.js（需要重新部署）

# 方法三：创建 .env 文件
echo "LESSON_PLANS_PATH=/var/www/basketball-coach-data/lesson_plans_raw.json" > /var/www/basketball-coach/.env
```

### 3. 重启服务

```bash
pm2 restart basketball-coach
```

### 4. 验证

```bash
# 查看日志确认数据加载
pm2 logs basketball-coach --lines 50 | grep RAG
```

## 更新数据流程

更新教案数据**不需要重新部署代码**：

```bash
# 1. 上传新的数据文件
scp new_lesson_plans.json root@62.234.79.188:/var/www/basketball-coach-data/lesson_plans_raw.json

# 2. 重启服务加载新数据
pm2 restart basketball-coach
```

## 数据文件格式

参考 `cases/lesson_plans_raw.json`，数据格式：

```json
[
  {
    "class_level": "幼儿班",
    "age_group": "U6",
    "month": "4月",
    "sheet": "启蒙",
    "section": "准备部分",
    "category": "warmup",
    "part": "",
    "duration": 2,
    "tech_type": "礼仪",
    "content": "1、集合站队...",
    "game_name": "无",
    "form": "原地进行",
    "equipment": "",
    "method": "所有学员在中场线站好...",
    "coach_guide": "比赛结束后...",
    "key_points": "1、通过比赛让孩子..."
  }
]
```

## 故障排除

### 日志显示 "加载外部数据失败"

- 检查文件路径是否正确
- 检查文件权限：`chmod 644 /var/www/basketball-coach-data/lesson_plans_raw.json`
- 检查文件内容是否是有效的 JSON

### 数据没有更新

- 确认 PM2 环境变量已设置：`pm2 show basketball-coach | grep LESSON_PLANS_PATH`
- 重启服务：`pm2 restart basketball-coach`
