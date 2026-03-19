# 篮球青训教案 RAG 系统设计

## 目标

让 AI 生成教案时能参考真实案例，使输出更贴合实际训练逻辑。

---

## 架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户请求                                  │
│   { group: "U10", duration: 90, theme: "运球", location: "室内" } │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      检索模块 (Retriever)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 字段过滤     │  │ 关键词匹配   │  │ 相似度检索   │             │
│  │ group=U10   │  │ theme=运球  │  │ (后续升级)   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      案例库 (Plan Knowledge)                     │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ id | group | theme | duration | sections | raw_text    │    │
│  │ 1  | U10   | 运球  | 90       | [...]     | "U10运球..." │    │
│  │ 2  | U10   | 投篮  | 90       | [...]     | "U10投篮..." │    │
│  │ 3  | U8    | 传球  | 60       | [...]     | "U8传球..."  │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Prompt 构造 (Prompt Builder)                  │
│                                                                  │
│  "你是一位专业篮球青训教练，请参考以下真实教案案例，生成新教案..."  │
│  + [案例1] U10 运球训练教案                                      │
│  + [案例2] U10 投篮训练教案                                      │
│  + 用户输入参数                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      大模型 (Kimi/MiniMax)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      教案输出                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 数据模型

### 方案 A：扩展现有 Prisma 模型

```prisma
// schema.prisma

model TrainingPlan {
  id          String   @id @default(cuid())
  title       String
  date        DateTime
  duration    Int
  group       String   // U6/U8/U10/U12/U14
  location    String   // 室内/室外
  weather     String?
  theme       String?
  focusSkills String?  // JSON array
  intensity   String?
  sections    String   // JSON array of sections
  notes       String?

  // RAG 专用字段
  rawText     String?  // 用于检索的原始文本（标题 + 主题 + 各环节名称拼接）
  isReference Boolean  @default(false)  // 是否作为参考案例

  generatedBy String?  // ai / rule
  status      String   @default("published")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 方案 B：独立案例库表

```prisma
model PlanCase {
  id          String   @id @default(cuid())

  // 检索字段
  group       String   // U6/U8/U10/U12/U14
  theme       String
  duration    Int
  location    String
  intensity   String

  // 完整内容
  title       String
  sections    String   // JSON
  rawText     String   // 检索用文本

  // 元数据
  source      String?  // 来源：用户提供/网络收集/AI生成
  tags        String?  // JSON array
  createdAt   DateTime @default(now())
}
```

---

## 检索策略

### 阶段 1：快速实现（字段匹配 + 关键词）

```typescript
// lib/plan-retriever.ts

interface RetrievalResult {
  cases: PlanCase[]
  relevance: number // 0-1
}

// 按优先级检索：
// 1. 完全匹配：group + theme + duration 相同
// 2. 模糊匹配：group + theme 相同
// 3. 降级匹配：group 相同，取最新
async function retrieveSimilarCases(params: {
  group: string
  theme?: string
  duration?: number
  location?: string
  limit?: number
}): Promise<RetrievalResult[]> {
  // 1. 构建查询条件
  // 2. 执行检索
  // 3. 返回结果
}
```

### 阶段 2：升级（向量检索）

```typescript
// 后续升级：添加文本嵌入
interface PlanCaseWithEmbedding extends PlanCase {
  embedding: number[] // 向量
}

// 使用 OpenAI embeddings 或 Kimi embeddings
async function generateEmbedding(text: string): Promise<number[]>

// 余弦相似度计算
function cosineSimilarity(a: number[], b: number[]): number
```

---

## Prompt 构造

```typescript
function buildRAGPrompt(params: AIPlanParams, cases: RetrievalResult[]): string {
  const caseExamples = cases.map((c, i) =>
    `【案例${i + 1}】${c.title}
年龄段：${c.group}
主题：${c.theme}
时长：${c.duration}分钟
场地：${c.location}
训练环节：
${JSON.stringify(c.sections, null, 2)}`
  ).join('\n\n')

  return `你是一位专业的篮球青训教练。以下是一些真实教案案例，请你参考它们的设计逻辑和训练安排，生成新的教案。

## 参考案例
${caseExamples}

## 新教案需求
- 年龄段：${params.group}
- 训练时长：${params.duration}分钟
- 场地：${params.location}
${params.theme ? `- 训练主题：${params.theme}` : ''}
${params.focusSkills?.length ? `- 重点技能：${params.focusSkills.join('、')}` : ''}

## 输出要求
生成一份符合上述需求的教案，环节安排应与参考案例风格一致。`
}
```

---

## 目录结构

```
basketball-coach/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── generate-plan/
│   │           └── route.ts          # AI 生成 API
│   ├── lib/
│   │   ├── db.ts                     # Prisma 客户端
│   │   ├── plan-generator.ts         # 规则引擎生成
│   │   ├── plan-retriever.ts         # RAG 检索模块 (新建)
│   │   ├── plan-prompt.ts            # Prompt 构造 (新建)
│   │   └── embeddings.ts             # 向量嵌入 (后续)
│   └── types/
│       └── plan.ts                   # 教案类型定义
├── prisma/
│   └── schema.prisma                 # 数据模型
└── cases/
    └── seed-cases.json               # 初始案例数据
```

---

## 实施计划

### Phase 1：快速上线（今天可完成）

- [ ] 创建 `PlanCase` 模型
- [ ] 编写 `plan-retriever.ts` 检索模块
- [ ] 修改 `generate-plan/route.ts` 集成检索
- [ ] 导入已有教案作为初始案例
- [ ] 测试生成效果

### Phase 2：数据积累

- [ ] 批量导入更多历史教案
- [ ] 添加案例管理后台（查看/编辑/新增案例）
- [ ] 添加案例标注（哪些是高质量案例）

### Phase 3：智能升级（可选）

- [ ] 集成向量嵌入服务
- [ ] 实现语义相似度检索
- [ ] 添加案例评分/排序算法

---

## 关键决策

1. **数据库**：继续用 SQLite（数据量 < 10万前足够）
2. **检索**：先用字段匹配，后续按需升级向量检索
3. **案例来源**：手动导入 + AI 生成验证后入库

---

## 需要你提供

1. **初始案例数据**：之前给你的教案案例（整理成 JSON 格式）
2. **后续导入计划**：预计会有多少案例？多久导入一次？

准备好后我开始实现 Phase 1。