'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Tag,
  Zap,
  Github,
  Calendar,
  Plus,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';

// 版本历史记录
const versions = [
  {
    version: 'v5.11.0',
    date: '2026-04-10',
    title: '教练工作台',
    description: '首页智能切换教练工作台，一页掌握全局',
    features: [
      { type: 'feature', text: 'API /api/dashboard - 汇总今日课程、课时预警、阶段目标' },
      { type: 'feature', text: '已登录显示教练工作台，未登录显示原首页' },
      { type: 'feature', text: '今日课程卡片：时间轴展示、签到统计、一键开始训练' },
      { type: 'feature', text: '课时预警：剩余≤4课时标黄、≤2课时标红' },
      { type: 'feature', text: '进行中目标进度条 + 近7天训练记录' },
      { type: 'improvement', text: '快捷操作：AI教案、训练执行、球员评估、学员管理' },
    ],
  },
  {
    version: 'v5.10.0',
    date: '2026-04-09',
    title: '成长曲线功能',
    description: '学员能力历史趋势可视化，支持多维度成长追踪',
    features: [
      { type: 'feature', text: 'API /api/players/[id]/growth-curve - 获取历史能力数据' },
      { type: 'feature', text: '可视化组件 GrowthCurveChart - 多维度能力趋势展示' },
      { type: 'feature', text: '学员详情页集成 - 能力评估上方展示成长曲线卡片' },
      { type: 'feature', text: '新增"成长曲线"标签页 - 详细查看历史趋势' },
      { type: 'feature', text: '支持6维度独立显示/隐藏：运球/传球/投篮/防守/体能/战术' },
      { type: 'improvement', text: '自动计算成长趋势（上升/下降/稳定）和成长速度' },
      { type: 'improvement', text: '成长洞察卡片 - 显示进步最快和需要关注的技能' },
    ],
  },
  {
    version: 'v5.9.0',
    date: '2026-04-09',
    title: 'Prompt 管理后台',
    description: 'AI 教案生成 Prompt 模板化，支持在线编辑和版本控制',
    features: [
      { type: 'feature', text: '数据库新增 PromptTemplate 表，支持版本控制' },
      { type: 'feature', text: 'API 路由：/api/prompts（CRUD + 版本管理）' },
      { type: 'feature', text: '管理页面：/prompts - 列表/编辑/预览/版本切换' },
      { type: 'improvement', text: '重构 generate-plan API：从数据库读取 Prompt 模板' },
      {
        type: 'improvement',
        text: '占位符系统：{{group}}、{{duration}}、{{ageGroupInfo}} 等动态变量',
      },
    ],
  },
  {
    version: 'v5.8.2',
    date: '2026-04-09',
    title: '教案生成 Prompt 大幅强化 + 详情页崩溃修复',
    description: '战术库扩充到60+个，动作描述6要素强制标签，时间匹配强化',
    features: [
      {
        type: 'fix',
        text: '教案详情页客户端崩溃：API 返回 sections 为 JSON 字符串导致前端 .map() 报错',
      },
      { type: 'feature', text: '战术库扩充：从15个扩充到60+个（完整进攻/防守/个人战术体系）' },
      {
        type: 'feature',
        text: '新增战术：反跑配合、高低位策应、突分配合、破盯人/联防/紧逼、个人攻防、挡拆防守等',
      },
      { type: 'improvement', text: '动作描述强制6个【】标签：姿势/动作/发力/次数/形式/要点目的' },
      { type: 'improvement', text: '时间匹配增加❌错误 vs ✅正确对比示例，强化 AI 遵守度' },
      {
        type: 'improvement',
        text: '运球/传球/投篮/防守各类动作增加精确细节要求（左右手、次数、路线）',
      },
    ],
  },
  {
    version: 'v5.8.1',
    date: '2026-04-09',
    title: '教案生成 JSON 截断修复',
    description: '解决 Kimi 模型输出被截断导致教案生成失败的问题',
    features: [
      { type: 'fix', text: 'Kimi 模型从 moonshot-v1-8k 升级到 moonshot-v1-32k' },
      { type: 'fix', text: 'max_tokens 从 8000 提升到 16000' },
      { type: 'feature', text: '新增 tryRepairTruncatedJson() 函数：智能修复被截断的 JSON 输出' },
    ],
  },
  {
    version: 'v5.8.0',
    date: '2026-04-09',
    title: '教案生成大幅优化',
    description: '热身压缩到5分钟、动作6要素描述、时间匹配计算、动作细节精确化',
    features: [
      { type: 'improvement', text: '热身环节优化：慢跑+拉伸严格控制在5分钟内' },
      { type: 'improvement', text: '动作描述6要素：姿势、动作、发力、时间/次数、形式、要点目的' },
      { type: 'improvement', text: 'duration 计算方法：确保标注时间与实际训练量匹配' },
      { type: 'improvement', text: '动作细节细化：运球/传球/投篮/防守各类增加精确要求' },
      {
        type: 'feature',
        text: '战术库扩充：进攻战术（快攻/阵地配合/整体进攻/破防守/固定战术）+ 防守战术',
      },
    ],
  },
  {
    version: 'v5.6.0',
    date: '2026-04-07',
    title: '通知系统全面升级',
    description: '通知服务层、训练完成自动通知、模板管理、批量发送、统计面板',
    features: [
      { type: 'feature', text: '训练完成自动通知：训练结束后自动发送训练报告给家长' },
      { type: 'feature', text: '通知模板管理：查看/编辑/启停通知模板' },
      { type: 'feature', text: '批量发送通知：支持全选/多选学员，{{playerName}} 变量替换' },
      { type: 'feature', text: '通知统计面板：发送量、已读率、状态分布、类型分布' },
      { type: 'feature', text: '防重复发送：24小时内不重复发送同类通知' },
    ],
  },
  {
    version: 'v5.5.0',
    date: '2026-04-07',
    title: 'Dashboard 数据看板升级',
    description: '出勤率/表现评分进度环、趋势图、排行榜、核心指标卡片',
    features: [
      { type: 'feature', text: '出勤率/表现评分进度环（自适应颜色）' },
      { type: 'feature', text: '近7天出勤率和表现评分趋势折线图（纯 SVG）' },
      { type: 'feature', text: '本周训练主题分布横向条形图' },
      { type: 'feature', text: '本周学员表现排行榜 Top5' },
      { type: 'feature', text: '核心指标卡片：在训学员/累计教案/本周课时/本周新增' },
    ],
  },
  {
    version: 'v5.4.1',
    date: '2026-04-07',
    title: '训练强度手动选择',
    description: 'AI 生成配置新增训练强度选择器，教练可在生成前指定低/中/高强度',
    features: [
      { type: 'feature', text: '新增训练强度三按钮选择器（低强度绿/中强度黄/高强度红）' },
      { type: 'feature', text: 'AI prompt 加入强度指导，按指定强度调整训练量和休息' },
      { type: 'feature', text: 'API 新增 intensity 参数，优先使用教练指定值' },
    ],
  },
  {
    version: 'v5.4.0',
    date: '2026-04-07',
    title: '水平与强度分离',
    description:
      '学员水平和训练强度分为两个独立维度，水平=基础/进阶/精英，强度=低/中/高，分别存储和展示',
    features: [
      { type: 'feature', text: '数据库新增 skillLevel 字段，与 intensity 独立存储' },
      {
        type: 'feature',
        text: '水平标签统一为：基础（青）/ 进阶（蓝）/ 精英（靛），与强度标签颜色区分',
      },
      { type: 'feature', text: '强度标签统一为：低强度（绿）/ 中强度（黄）/ 高强度（红）' },
      { type: 'feature', text: '教案创建预览、列表页、详情页统一展示两个独立标签' },
      { type: 'feature', text: 'AI 生成时 skillLevel 存入数据库，列表和详情页可正确展示' },
    ],
  },
  {
    version: 'v5.3.1',
    date: '2026-04-07',
    title: '薄弱环节分析开关',
    description: '教案生成页新增开关控制是否根据学员薄弱环节生成教案，前期学员数据不足时可关闭',
    features: [
      { type: 'feature', text: '新增「根据学员薄弱环节生成教案」开关，默认关闭' },
      { type: 'feature', text: '开关关闭时不传学员数据给AI，避免无意义分析' },
      { type: 'feature', text: '开关状态提示：未选学员时提示需先选择，已选时显示学员数量' },
    ],
  },
  {
    version: 'v5.3.0',
    date: '2026-04-07',
    title: '智能教案生成 — 学员短板分析',
    description: 'AI生成教案时自动分析参训学员的技能评估数据，识别薄弱技能并针对性调整训练内容',
    features: [
      { type: 'feature', text: '学员技能短板自动分析：运球/传球/投篮/防守/体能/战术 6维度评分' },
      { type: 'feature', text: '薄弱技能自动识别：低于6分或低于整体平均分的技能重点标注' },
      { type: 'feature', text: '短板分析注入 AI Prompt：教案自动侧重学员薄弱环节' },
      { type: 'feature', text: '未指定重点技能时，自动从短板中提取推荐（前3个最低分）' },
      { type: 'feature', text: '已选学员时学员人数自动获取，无需手动填写' },
    ],
  },
  {
    version: 'v5.2.0',
    date: '2026-04-07',
    title: '版本管理规范化',
    description: '建立 CHANGELOG 版本记录体系，规范发版流程',
    features: [
      { type: 'feature', text: '创建 CHANGELOG.md，补全 v4.0 → v5.2 完整版本历史' },
      { type: 'feature', text: 'package.json 版本号从 1.0.0 更新到 5.2.0' },
      { type: 'feature', text: '建立发版规范：版本号递增 + CHANGELOG 记录 + 部署' },
    ],
  },
  {
    version: 'v5.1',
    date: '2026-04-06',
    title: '账号权限系统',
    description:
      '完整的用户认证体系：登录注册、JWT鉴权、角色权限、教练管理、Token自动刷新、头像上传',
    features: [
      { type: 'feature', text: '登录/注册页面 — 邮箱+密码认证，bcrypt加密存储' },
      { type: 'feature', text: 'JWT Token 鉴权 — 7天有效期 + 30天刷新宽限期' },
      { type: 'feature', text: '角色权限控制 — admin（管理员）/ coach（教练）两种角色' },
      { type: 'feature', text: '教练管理 — CRUD操作、权限控制、管理员重置密码' },
      { type: 'feature', text: 'API路由认证加固 — 64/72个API路由受保护，未登录拒绝访问' },
      { type: 'feature', text: '个人设置 — 修改个人信息、修改密码、上传头像' },
      { type: 'feature', text: 'Token自动刷新 — 过期前5分钟自动刷新，并发请求去重' },
      { type: 'feature', text: '头像上传 — 支持JPG/PNG/GIF/WebP，≤2MB，自动更新数据库' },
      { type: 'feature', text: '前端集成 — UserMenu用户菜单、退出登录、移动端导航适配' },
    ],
    fixes: [
      { type: 'fix', text: '修复注册接口可指定admin角色的安全漏洞' },
      { type: 'fix', text: '修复GET /api/coaches普通教练可访问的权限漏洞' },
      { type: 'fix', text: 'Schema优化：email/password/role字段改为required' },
    ],
  },
  {
    version: 'v4.9',
    date: '2026-04-05',
    title: '全场景篮球场地图 + SVG验证强化',
    description: '所有活动类型统一使用标准篮球半场图，AI生成的非标准SVG自动替换',
    features: [
      { type: 'feature', text: '所有活动（运球、传球、体能、拉伸等）统一使用标准篮球半场图' },
      { type: 'feature', text: 'SVG验证增强：AI生成的非篮球场地图自动替换为标准场地图' },
    ],
    fixes: [{ type: 'fix', text: '修复部分活动示意图仍显示虚线边框而非篮球场的问题' }],
  },
  {
    version: 'v4.8',
    date: '2026-04-05',
    title: 'SVG场地图重写 + 动作拆分 + 级别差异化 + 主题多选',
    description: '基于真实教案标准全面优化：FIBA标准比例、动作单独列出、三级差异化训练',
    features: [
      { type: 'feature', text: 'SVG场地图重写：FIBA标准比例（28m×15m）、准确三分线、罚球区、篮筐' },
      {
        type: 'feature',
        text: '动作单独列出：每个拉伸/动作不再笼统合并，独立描述姿势、次数、要点',
      },
      { type: 'feature', text: '基础/进阶/精英三级差异化：参考2023年暑期教案真实标准' },
      { type: 'feature', text: '训练主题支持多选（如运球+传球同时训练）' },
      { type: 'feature', text: '附加要求严格执行：AI必须遵循教练特别要求生成教案' },
    ],
    fixes: [
      { type: 'fix', text: '修复投篮/上篮/对抗训练球员站位不贴合实际的问题' },
      { type: 'fix', text: '修复teams页面重复代码块导致的构建错误' },
    ],
  },
  {
    version: 'v4.7',
    date: '2026-04-04',
    title: '教案生成动作规范化 + 篮球场图增强',
    description: '动作6要素模板 + 投篮/上篮/对抗训练自动生成标准篮球半场图',
    features: [
      {
        type: 'feature',
        text: '动作描述规范化 - 新增6要素模板：姿势、动作、发力、时间/次数、形式、要点目的',
      },
      { type: 'feature', text: '投篮/上篮/对抗训练自动生成标准篮球半场图（三分线、罚球圈、篮筐）' },
      { type: 'feature', text: '场地图标注站位点和移动路线' },
      { type: 'feature', text: '参考小基础/小提高教案优化动作描述格式' },
    ],
    fixes: [{ type: 'fix', text: '修复动作描述过于笼统的问题（如"球性熟悉"改为具体动作）' }],
  },
  {
    version: 'v4.4',
    date: '2026-04-03',
    title: '教案生成增强优化',
    description: 'SVG战术图解 + 递进式关联设计 + 动作细节完善',
    features: [
      { type: 'feature', text: '恢复【列队】【位置】【动作】三段式描述格式' },
      {
        type: 'feature',
        text: '每个活动生成SVG战术图解（学员蓝圈+编号、教练红方块、球橙点、箭头路线）',
      },
      { type: 'feature', text: '递进式关联设计：热身基础动作 → 正式标准训练 → 对抗实战应用' },
      { type: 'feature', text: '添加relatedTo字段：热身动作显示"为后面的XX做准备"关联提示' },
      { type: 'feature', text: 'trainingProgression字段自动生成完整前后关联说明' },
      { type: 'feature', text: '每个动作包含组数、次数、递进式3层次设计' },
      { type: 'feature', text: '生成、保存、查看全流程保持一致' },
    ],
    fixes: [
      { type: 'fix', text: '添加JSON解析错误处理和自动修复机制' },
      { type: 'fix', text: '修复详情页丢失SVG图解、关联提示等问题' },
      { type: 'fix', text: '修复campuses页面TypeScript类型错误' },
    ],
  },
  {
    version: 'v4.3',
    date: '2026-03-30',
    title: '版本管理 + UI 优化',
    description: '增加版本管理功能，优化教案生成 UI',
    features: [
      { type: 'feature', text: '左上角显示当前版本号 v4.3' },
      { type: 'feature', text: '右上角导航增加版本管理入口' },
      { type: 'feature', text: '版本管理页面展示完整历史记录' },
      { type: 'feature', text: '教案头部显示技能水平 + 训练强度双标签' },
    ],
    fixes: [{ type: 'fix', text: '修复技能水平标签显示问题' }],
  },
  {
    version: 'v4.2',
    date: '2026-03-30',
    title: 'AI 教案生成优化 + 智能分析',
    description: '重构教案生成逻辑，增加智能分析',
    features: [
      { type: 'feature', text: '三段式教案结构（每30分钟一节）' },
      { type: 'feature', text: 'U10 基础/进阶/精英 三级版本' },
      { type: 'feature', text: '去掉教练引导语，只保留动作描述' },
      { type: 'feature', text: '批量导入学员（CSV表格）' },
    ],
    fixes: [{ type: 'fix', text: '修复教练API缺少password字段的TypeScript错误' }],
  },
];

export default function VersionPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Tag className="w-5 h-5 text-gray-600" />
              版本管理
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 当前版本 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">当前版本</h2>
                <p className="text-gray-500 text-sm">查看最新功能和改进</p>
              </div>
            </div>
            <div className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg font-bold text-lg">
              {versions[0].version}
            </div>
          </div>
          <div className="prose max-w-none">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{versions[0].title}</h3>
            <p className="text-gray-600">{versions[0].description}</p>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {versions[0].date}
            </div>
            <div className="flex items-center gap-1">
              <Github className="w-4 h-4" />
              <a
                href="https://github.com/maomaoaichibing/basketball-coach"
                target="_blank"
                className="hover:text-gray-700"
              >
                查看源码
              </a>
            </div>
          </div>
        </div>

        {/* 版本历史 */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            版本历史
          </h2>

          {versions.map((version, idx) => (
            <div key={idx} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-bold">
                    {version.version}
                  </div>
                  <div className="text-sm text-gray-500">{version.date}</div>
                </div>
                {idx === 0 && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                    最新
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{version.title}</h3>
              <p className="text-gray-600 mb-4">{version.description}</p>

              {/* 新功能 */}
              {version.features && version.features.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Plus className="w-4 h-4 text-green-600" />
                    新功能
                  </h4>
                  <ul className="space-y-1">
                    {version.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feat.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 修复 */}
              {version.fixes && version.fixes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    修复与优化
                  </h4>
                  <ul className="space-y-1">
                    {version.fixes.map((fix, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2 text-sm text-gray-600">
                        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span>{fix.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">版本更新说明</p>
              <p>
                系统会持续迭代优化，每个版本都会带来新的功能和改进。建议定期查看版本更新日志，了解最新功能。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
