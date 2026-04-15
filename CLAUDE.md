# CLAUDE.md — Basketball Coach（篮球青训系统）

> 基于 Karpathy 编码规则 + Basketball Coach 项目特定约束

## 项目概览
- **名称**: Basketball Coach — 篮球青训系统
- **技术栈**: Next.js + TypeScript + Tailwind CSS + Prisma + SQLite
- **部署**: 62.234.79.188:3000（腾讯云，PM2 ID=2）
- **测试**: Vitest（60套件 558用例）
- **版本**: v5.12.2

---

## 一、编码前先思考

- 修改前先读相关文件，理解训练模块 v2 的设计（8模块×26分类×106+子技能）
- AI 教案生成涉及 Prompt 工程，修改前确认不会破坏 Prompt 模板
- 涉及数据模型修改时，先确认 Prisma schema 和现有数据兼容性
- 战术库（60+战术）的 JSON 数据结构复杂，修改前备份

## 二、简洁优先

- 技能封闭是核心约束（v5.12.2 validateAndFixPlan），不要绕过
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

## 五、项目特有规则

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

### 技能封闭（v5.12.2，100%零违规）
- `validateAndFixPlan()` 自动校验+修复训练计划
- 9大主题规则（如 PG 专注控球/组织，C 专注篮板/内线）
- Prompt 约束 + 代码后处理双保险
- **永远不要绕过技能封闭检查**

### AI 教案生成
- SVG 战术图解（学员蓝圈+编号，教练红方块，球橙点，箭头路线）
- Prompt 深度强化：子技能独立 activity、主题针对性热身、技能封闭自检

### 战术库
- 60+ 战术：进攻（快攻/阵地/整体/破防守）+ 防守（盯人/联防/紧逼）
- 动作描述必须精确化，JSON 结构不可随意更改

### 安全
- JWT + Token 刷新 + 头像上传
- AuthGuard / AuthProvider / middleware 多环节
- `safeJsonParse` 替代裸 `JSON.parse`
- `mustChangePassword` 首次登录强制改密

### 测试
- 60 套件 558 用例，全部通过是部署前置条件
- 新功能必须有对应测试
- 修改 Prompt 后必须跑 AI 相关测试验证

### 部署红线 🔴
1. **本地测试成功前禁止部署**
2. **PM2 必须在正确 cwd 启动**（cd /var/www/basketball-coach）
3. **每次部署**: `git pull → prisma db push → prisma generate → rm -rf .next → npm run build → pm2 restart`
4. **schema 变更必须先 db push 再 build**
5. **部署后**: `pm2 save` + 验证首页 200 + `pm2 show 2 | grep cwd`

---

*基于 Karpathy 规则 + Basketball Coach 项目实践，2026-04-15*
