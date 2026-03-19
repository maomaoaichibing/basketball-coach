# 篮球青训教案系统 - 产品架构规划

## 产品愿景

一个智能化的篮球青训管理系统，不仅能生成教案，还能追踪学员成长、管理教练工作流程，最终实现"输入学员 → 输出个性化教案"的自动化。

---

## 系统模块总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户端 (Web/App)                          │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│   教练端      │   学员端      │   管理端      │   AI 能力         │
│   Coach      │   Student    │   Admin      │   AI Engine       │
├──────────────┴──────────────┴──────────────┴───────────────────┤
│                         业务逻辑层 (Business)                    │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│ 教案管理      │ 成长追踪      │ 账户权限      │ 智能生成           │
│ Plan Mgmt    │ Growth Track │ Auth & Roles │ RAG + AI Gen      │
├──────────────┴──────────────┴──────────────┴───────────────────┤
│                         数据层 (Data)                            │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│ 教案库        │ 学员档案      │ 教练账户      │ 案例知识库         │
│ Plan DB      │ Student DB   │ Coach DB     │ Case Knowledge    │
└──────────────┴──────────────┴──────────────┴───────────────────┘
```

---

## 模块详细设计

### 1. 教案系统 (Plan System)

#### 1.1 教案管理
- 创建/编辑/删除教案
- 教案模板库
- 教案分类（按年龄/主题/技能）

#### 1.2 AI 生成（RAG）
- 参考案例库检索
- 多模板融合
- 生成质量评估

#### 1.3 教案执行
- 教案分配给班级/学员
- 实际上课记录
- 教案反馈收集

---

### 2. 学员成长系统 (Student Growth System)

#### 2.1 学员档案
```typescript
interface Student {
  id: string
  name: string
  avatar?: string
  birthDate: Date
  gender: 'male' | 'female'

  // 所属
  coachId: string        // 主教练
  teamId?: string       // 所属球队

  // 技能评估
  skillLevels: {
    dribbling: number    // 1-5
    passing: number
    shooting: number
    defending: number
    physical: number
  }

  // 成长数据
  trainingHistory: TrainingRecord[]  // 训练记录
  assessmentHistory: Assessment[]    // 评估记录
  attendanceRate: number            // 出勤率

  // 状态
  status: 'active' | 'inactive'
  createdAt: Date
  updatedAt: Date
}
```

#### 2.2 成长追踪
```typescript
interface TrainingRecord {
  id: string
  studentId: string
  planId: string              // 使用的教案
  date: Date

  // 参与情况
  attended: boolean
  duration: number            // 实际上课时长

  // 本次表现
  performance: {
    engagement: number         // 投入度 1-5
    skillProgress: string[]   // 有进步的技能
    notes: string            // 教练备注
  }

  // 下次训练建议
  suggestions: string[]
}
```

#### 2.3 智能教案生成（根据学员）

```typescript
// 输入：特定学员或班级
interface GenerateForStudentsParams {
  studentIds: string[]                    // 要训练的学员
  teamId?: string                        // 或班级
  date: Date
  duration: number
  coachId: string
}

// AI 检索：该班学员的历史训练、技能短板
async function generatePlanForStudents(params: GenerateForStudentsParams): Promise<TrainingPlan> {
  // 1. 获取学员档案和历史训练
  const students = await getStudents(params.studentIds)
  const histories = await getTrainingHistories(params.studentIds)

  // 2. 分析技能短板
  const weakSkills = analyzeWeaknesses(students)  // ['运球', '防守']

  // 3. 检索相似案例（参考同龄同短板的成功教案）
  const similarCases = await retrieveCases({
    group: students[0].group,
    focusSkills: weakSkills,
    similarHistory: histories
  })

  // 4. 生成个性化教案
  const plan = await generatePlan({
    ...params,
    focusSkills: weakSkills,
    studentContext: buildContext(students, histories),
    referenceCases: similarCases
  })

  return plan
}
```

---

### 3. 教练账户系统 (Coach System)

#### 3.1 账户模型
```typescript
interface Coach {
  id: string
  email: string
  passwordHash: string

  // 基本信息
  name: string
  avatar?: string
  phone?: string

  // 资质
  certifications: string[]   // 教练证书
  experience: number        // 工作年限

  // 权限
  role: 'coach' | 'head_coach' | 'admin'

  // 关联
  teamIds: string[]         // 管理的球队

  // 统计
  stats: {
    totalStudents: number
    totalTrainings: number
    avgRating: number      // 学员评分
  }

  createdAt: Date
  updatedAt: Date
}
```

#### 3.2 权限设计
```
admin
  └── head_coach
        └── coach

admin:     系统管理 + 教练管理 + 数据查看
head_coach: 本队教练管理 + 学员管理 + 数据查看
coach:     教案管理 + 学员训练记录 + 查看自己学员
```

#### 3.3 教练工作台
- 今日课程安排
- 待处理训练记录
- 学员成长周报
- 教案库

---

### 4. 球队管理 (Team System)

```typescript
interface Team {
  id: string
  name: string
  coachId: string              // 主教练
  assistantCoachIds: string[]  // 助理教练

  // 球队信息
  ageGroup: 'U6' | 'U8' | 'U10' | 'U12' | 'U14'
  level: 'beginner' | 'intermediate' | 'advanced'
  memberIds: string[]          // 学员ID列表

  // 训练安排
  schedule: {
    dayOfWeek: number          // 0-6
    time: string               // "19:00"
    location: string           // 训练场地
  }[]

  createdAt: Date
}
```

---

## 数据模型（完整）

```prisma
// schema.prisma

model Coach {
  id          String   @id @default(cuid())
  email       String   @unique
  password    String
  name        String
  avatar      String?
  phone       String?
  role        String   @default("coach")  // coach / head_coach / admin

  teams       Team[]   @relation("CoachTeams")
  students    Student[] @relation("CoachStudents")
  plans       Plan[]   @relation("CoachPlans")
  records     TrainingRecord[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Team {
  id          String   @id @default(cuid())
  name        String
  ageGroup    String   // U6/U8/U10/U12/U14
  level       String   @default("beginner")
  location    String?
  schedule    String?  // JSON

  coachId     String
  coach       Coach    @relation("CoachTeams", fields: [coachId], references: [id])

  members     Student[] @relation("TeamMembers")
  plans       Plan[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Student {
  id          String   @id @default(cuid())
  name        String
  avatar      String?
  birthDate   DateTime
  gender      String

  coachId     String
  coach       Coach    @relation("CoachStudents", fields: [coachId], references: [id])

  teamId      String?
  team        Team?    @relation("TeamMembers", fields: [teamId], references: [id])

  // 技能等级
  skillLevels String   @default("{}")  // JSON: {dribbling: 3, passing: 2, ...}

  // 统计数据
  stats       String   @default("{}")  // JSON: {totalTrainings: 10, attendanceRate: 0.9, ...}

  status      String   @default("active")

  records     TrainingRecord[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model TrainingRecord {
  id          String   @id @default(cuid())
  date        DateTime

  studentId   String
  student     Student  @relation(fields: [studentId], references: [id])

  planId      String?
  plan        Plan?    @relation(fields: [planId], references: [id])

  coachId     String
  coach       Coach    @relation(fields: [coachId], references: [id])

  // 本次表现
  attended    Boolean  @default(true)
  duration    Int
  performance String?  // JSON: {engagement: 4, skillProgress: ['运球'], notes: '...'}

  createdAt   DateTime @default(now())
}

model Plan {
  id          String   @id @default(cuid())
  title       String
  date        DateTime
  duration    Int
  group       String
  location    String
  weather     String?
  theme       String?
  focusSkills String?  // JSON array
  intensity   String?
  sections    String   // JSON
  notes       String?

  // RAG
  rawText     String?
  isReference Boolean @default(false)

  generatedBy String?  // ai / rule
  status      String   @default("published")

  coachId     String?
  coach       Coach?   @relation("CoachPlans", fields: [coachId], references: [id])

  teamId      String?
  team        Team?    @relation(fields: [teamId], references: [id])

  records     TrainingRecord[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// 案例库（独立于教案）
model PlanCase {
  id          String   @id @default(cuid())
  group       String
  theme       String
  duration    Int
  location    String
  intensity   String?

  title       String
  sections    String   // JSON
  rawText     String   // 检索用

  source      String?  // 来源
  tags        String?  // JSON array
  quality     Int      @default(3)  // 1-5 质量评分

  createdAt   DateTime @default(now())
}
```

---

## 开发路线图

### Phase 0: 基础（当前完成度 ~80%）
- [x] 教案生成（规则引擎）
- [x] 教案生成（AI RAG 基础版）
- [ ] 教案库管理
- [ ] 案例导入

### Phase 1: 账户体系
- [ ] 教练注册/登录
- [ ] JWT 认证
- [ ] 教练主页
- [ ] 权限控制

### Phase 2: 学员管理
- [ ] 学员 CRUD
- [ ] 学员档案页
- [ ] 班级管理
- [ ] 学员分配给教练

### Phase 3: 成长追踪
- [ ] 训练记录（教练填写）
- [ ] 技能等级更新
- [ ] 成长曲线展示
- [ ] 周期性报告

### Phase 4: 智能教案 2.0
- [ ] 根据学员技能短板生成
- [ ] 根据班级整体水平生成
- [ ] 历史训练避免重复
- [ ] 案例库扩充

### Phase 5: 高级功能
- [ ] 教案分享/评论
- [ ] 教练社区
- [ ] 家长端（查看孩子成长）
- [ ] 数据分析看板

---

## 技术选型

| 模块 | 技术 | 说明 |
|------|------|------|
| 前端 | Next.js 14 | App Router |
| 后端 | Next.js API Routes | 服务端逻辑 |
| 数据库 | SQLite + Prisma | 当前够用，后续可升级 PostgreSQL |
| 认证 | NextAuth.js | 后续添加 |
| 文件存储 | 本地 / 腾讯云 COS | 后续需求 |
| AI | Kimi API + MiniMax | 当前已集成 |
| 向量检索 | 后续接入 | Milvus / Pinecone |

---

## 目录结构（扩展后）

```
basketball-coach/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/
│   │   │   ├── coach/
│   │   │   ├── student/
│   │   │   ├── team/
│   │   │   └── plan/
│   │   └── api/
│   │       ├── auth/
│   │       ├── plans/
│   │       ├── students/
│   │       ├── teams/
│   │       └── generate-plan/
│   ├── components/
│   │   ├── ui/
│   │   ├── coach/
│   │   ├── student/
│   │   └── plan/
│   ├── lib/
│   │   ├── db.ts
│   │   ├── auth.ts
│   │   ├── plan-generator.ts
│   │   ├── plan-retriever.ts      # RAG 检索
│   │   └── plan-prompt.ts        # Prompt 构造
│   └── types/
│       └── index.ts
├── prisma/
│   ├── schema.prisma
│   └── seed/
└── docs/
    ├── RAG_DESIGN.md
    └── API_DESIGN.md
```

---

## 下一步行动

1. **确认架构**：以上设计是否符合你的预期？
2. **优先级排序**：你想先做 Phase 1（账户）还是继续完善 Phase 0（RAG）？
3. **数据准备**：准备好教案案例数据，我们开始 RAG 开发。