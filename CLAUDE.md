# CLAUDE.md — Basketball Coach（篮球青训系统）

> 基于 Karpathy 编码规则 + Basketball Coach 项目特定约束
> 最后更新: 2026-04-16

## 项目概览

- **名称**: Basketball Coach — 篮球青训系统
- **版本**: v5.15.0
- **技术栈**: Next.js 14 (App Router) + TypeScript 5.9 + Tailwind CSS 3.4 + Prisma 5.10 + SQLite
- **测试**: Jest 29 + ts-jest + @testing-library/react（60套件 558用例）
- **部署**: 62.234.79.188:4001（腾讯云，PM2 ID=2）
- **一键部署**: `cd /Users/zhangxiaohei/WorkBuddy/Claw && ./scripts/deploy.sh basketball`

---

## 一、编码前先思考

- 修改前先读相关文件，理解训练模块 v2 的设计（8模块×26分类×106+子技能，定义在 `src/lib/training-modules.ts`）
- AI 教案生成涉及 Prompt 工程，修改前确认不会破坏 Prompt 模板（`src/lib/ai-plan-generator.ts`）
- 涉及数据模型修改时，先确认 Prisma schema 和现有数据兼容性（33个 model）
- 战术库（60+战术）的 JSON 数据结构复杂，修改前备份

## 二、简洁优先

- 技能封闭是核心约束（`validateAndFixPlan()`），不要绕过
- 新增训练模块遵循递进式设计：热身基础→正式标准→对抗实战
- UI 组件优先复用现有设计模式，不要引入新的 UI 框架
- 不要为"可能未来需要"的功能预留代码

## 三、精准修改

- 修改 API 路由时确保前后端接口兼容
- Prisma schema 变更必须先 `prisma db push` 再 `prisma generate`
- 不要修改已有的课时计算逻辑（签到/评分/反馈联动）
- CSS 使用 Tailwind，不引入自定义 CSS 文件（除非有特殊动画需求）

## 四、目标驱动执行

- 数据库修改：先改 schema → db push → 生成 → 写测试 → 实现
- AI 功能修改：先改 Prompt → 本地测试 → 写测试 → 构建
- 部署：本地全部测试通过 → `npm run build` → 部署

---

## 五、项目架构

### 目录结构
```
src/
├── app/                    # Next.js App Router
│   ├── api/                # 40个 API 路由目录
│   │   └── [entity]/       # route.ts (列表/创建) + [id]/route.ts (详情/更新/删除)
│   ├── (30+页面目录)       # dashboard, players, plans, matches, etc.
│   ├── layout.tsx          # RootLayout (Providers 包裹)
│   ├── providers.tsx       # AuthProvider 全局注入
│   └── globals.css
├── components/             # 6个共享组件 (AuthProvider, MobileNav, UserMenu, etc.)
├── hooks/                  # 3个语音相关 Hook
├── lib/                    # 核心业务逻辑
│   ├── db.ts               # Prisma 客户端单例
│   ├── auth.ts / jwt.ts / auth-middleware.ts  # 认证
│   ├── training-modules.ts # 训练模块 v2 定义 (53KB)
│   ├── ai-plan-generator.ts # AI 教案生成
│   ├── cases.ts            # 训练案例
│   └── generator/          # 生成器子模块
├── server/services/        # 服务层 (notificationService)
├── types/index.ts          # 共享类型定义
└── middleware.ts            # 路由守卫 (检查 auth_token cookie)
__tests__/                  # 测试（按层分目录）
├── api/                    # 55个 API 路由测试
├── lib/                    # 库函数测试
└── server/services/        # 服务测试
prisma/
├── schema.prisma           # 33个数据模型
└── seed.ts                 # 种子数据
```

### 路由模式
- **App Router**: 页面在 `src/app/` 按目录组织
- **公开路由**: `/`, `/login`, `/register`, `/version`, `/parent/*`
- **受保护路由**: 所有其他页面（middleware 检查 `auth_token` cookie）
- **API 鉴权**: middleware 只检查 cookie 存在性，真正验证在各 API route 内通过 `auth-middleware.ts` 完成

### 代码风格
```jsonc
// Prettier (.prettierrc.json)
{ "semi": true, "singleQuote": true, "printWidth": 100, "tabWidth": 2, "trailingComma": "es5", "arrowParens": "avoid" }
```
- 文件命名: kebab-case（`auth-middleware.ts`）
- 组件命名: PascalCase（`AuthProvider.tsx`）
- 客户端组件: 必须标注 `'use client'`
- 路径别名: `@/*` → `./src/*`
- ESLint: flat config（`eslint.config.mjs`），`no-explicit-any: warn`

---

## 六、项目特有规则

### 训练模块 v2 结构
```
8 大模块 × 26 分类 × 106+ 子技能
├── 体能训练（力量/速度/耐力/敏捷/柔韧）
├── 基础技术（运球/投篮/传球/防守/篮板）
├── 进阶技术（突破/中距离/三分/盖帽/抢断）
├── 战术理解（进攻/防守/快攻/阵地/整体）
├── 心理素质（专注/抗压/自信/团队/领导）
├── 比赛准备（热身/恢复/营养/战术分析）
├── 位置专项（PG/SG/SF/PF/C）
└── 综合训练（体能+技术+战术组合）
```

### 技能封闭（核心约束，不可绕过）
- `validateAndFixPlan()` 自动校验+修复训练计划
- 9大主题规则（如 PG 专注控球/组织，C 专注篮板/内线）
- Prompt 约束 + 代码后处理双保险
- **永远不要绕过技能封闭检查**

### AI 教案生成
- SVG 战术图解（学员蓝圈+编号，教练红方块，球橙点，箭头路线）
- Prompt 深度强化：子技能独立 activity、主题针对性热身、技能封闭自检
- 原始数据: `src/lib/lesson_plans_raw.json`（3.79MB，不要随意修改）

### 战术库
- 60+ 战术：进攻（快攻/阵地/整体/破防守）+ 防守（盯人/联防/紧逼）
- 动作描述必须精确化，JSON 结构不可随意更改

### 安全
- JWT + Token 刷新 + 头像上传
- AuthGuard / AuthProvider / middleware 多环节
- `safeJsonParse` 替代裸 `JSON.parse`
- `mustChangePassword` 首次登录强制改密

### 测试
- **测试框架**: Jest 29（不是 Vitest！）
- 60 套件 558 用例，全部通过是部署前置条件
- 新功能必须有对应测试
- 修改 Prompt 后必须跑 AI 相关测试验证
- 测试命令: `npm test` / `npm run test:watch` / `npm run test:coverage`

### 部署红线 🔴
1. **本地测试成功前禁止部署**
2. **PM2 必须在正确 cwd 启动**（cd /var/www/basketball-coach）
3. **每次部署**: `git pull → prisma db push → prisma generate → rm -rf .next → npm run build → pm2 restart`
4. **schema 变更必须先 db push 再 build**
5. **部署后**: `pm2 save` + 验证首页 200 + `pm2 show 2 | grep cwd`

### 常用命令
```bash
npm run dev           # 开发服务器
npm run build         # 生产构建
npm test              # 运行测试
npm run test:watch    # 监听模式测试
npm run lint          # ESLint
npm run db:push       # Prisma schema 同步
npm run db:generate   # Prisma 客户端生成
npm run type-check    # TypeScript 类型检查
```

---

*基于 Karpathy 规则 + Basketball Coach 项目实践，2026-04-16*
