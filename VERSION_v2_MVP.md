# 篮球青训教学运营管理系统 v2.0 MVP

## 版本信息
- **版本号**: v2.0 MVP
- **发布日期**: 2026-03-20
- **前身版本**: v1.0 (备份于 `backups/basketball-coach-v1.0-20260320.zip`)

---

## 产品定位
面向篮球青训机构、训练营、篮球培训班的数字化管理平台，**v2.0 MVP 聚焦「教学执行闭环」**。

---

## v2.0 MVP 功能范围

### 核心闭环
```
👦 学员管理 → 📚 教案生成 → ✅ 课后反馈 → 📊 成长记录
```

### 功能清单

| 模块 | 功能点 | 优先级 | 状态 |
|------|--------|--------|------|
| 学员管理 | 学员档案 CRUD | P0 | 待实现 |
| 学员管理 | 学员分班/分组 | P0 | 待实现 |
| 学员管理 | 学员详情页 | P0 | 待实现 |
| 教案生成 | 教案模板管理 | P0 | 已有 |
| 教案生成 | AI 教案生成 | P0 | 已有 |
| 教案生成 | 教案复制/调整 | P1 | 待实现 |
| 课后反馈 | 训练记录填写 | P0 | 新增 |
| 课后反馈 | 课后反馈模板 | P0 | 新增 |
| 课后反馈 | 快速反馈入口 | P0 | 新增 |
| 成长记录 | 能力评估 | P0 | 已有 |
| 成长记录 | 成长轨迹展示 | P1 | 待增强 |
| 成长记录 | 阶段目标 | P1 | 待实现 |

---

## 技术架构

### 技术栈
- **前端**: Next.js 14 + TypeScript + Tailwind CSS
- **UI组件**: shadcn/ui (备选)
- **数据库**: SQLite + Prisma ORM
- **AI生成**: OpenAI GPT-4 (可选)

### 数据模型

```
Player (学员)
├── id, name, birthDate, gender, group
├── height, weight
├── dribbling, passing, shooting, defending, physical, tactical
├── teamId → Team
├── parentName, parentPhone
└── records → TrainingRecord[]

Team (球队/班级)
├── id, name, group
├── coachName, coachPhone
├── location, trainingTime
└── players → Player[]

TrainingPlan (教案)
├── id, title, date, duration, group
├── location, weather, temperature
├── theme, focusSkills
├── sections (JSON)
├── status: draft/published/completed
└── records → TrainingRecord[]

TrainingRecord (训练记录/课后反馈)
├── id, planId, playerId
├── attendance: present/absent/late
├── performance, effort, attitude
├── highlights, issues, improvements
├── homework
└── recordedAt

PlayerAssessment (能力评估)
├── id, playerId
├── dribbling, passing, shooting, defending, physical, tactical
├── overall, notes
├── assessor, assessedAt
```

---

## 页面结构

```
/                           首页仪表盘
├── /players                 学员列表
│   └── /players/[id]        学员详情
├── /plans                   教案库
│   ├── /plans/[id]          教案详情
│   └── /plan/new             创建教案
├── /teams                   球队管理
├── /assessment              能力评估
├── /growth                  成长记录
├── /feedback                课后反馈 (新增)
└── /settings                系统设置
```

---

## 开发计划

### Phase 1: 数据层增强
- [ ] 完善 Prisma 数据模型
- [ ] 创建学员 API CRUD
- [ ] 创建训练记录 API

### Phase 2: 学员管理增强
- [ ] 学员列表页接数据库
- [ ] 学员详情页
- [ ] 学员添加/编辑功能

### Phase 3: 课后反馈模块
- [ ] 课后反馈页面
- [ ] 反馈填写表单
- [ ] 反馈列表/历史

### Phase 4: 成长记录增强
- [ ] 成长轨迹可视化
- [ ] 阶段目标管理

---

## 验收标准

1. ✅ 学员可以正常添加、编辑、删除
2. ✅ 教案可以正常生成和查看
3. ✅ 课后反馈可以填写并保存
4. ✅ 学员详情页可以看到历史训练记录
5. ✅ 成长记录可以看到能力变化趋势

---

## 下一步扩展方向

### V2.1
- 课程管理（排课、预约）
- 签到点名
- 课时管理

### V2.2
- 家长端查看
- 订单缴费
- 通知提醒

### V3.0
- AI 动作识别（预留接口）
- 智能推荐
- 多校区管理
