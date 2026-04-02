import https from 'https';

import { NextRequest, NextResponse } from 'next/server';

import { TrainingPlanOutput, PlanSection } from '@/lib/plan-generator';
import { retrieveSimilarCases, allPlans, LessonPlan } from '@/lib/cases';

// AI生成参数
interface AIPlanParams {
  group: string;
  duration: number;
  location: string;
  weather?: string;
  theme?: string;
  focusSkills?: string[];
  additionalNotes?: string;
  playerCount?: number;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  previousTraining?: string[];
  // 调试参数：设为 true 时返回检索到的 RAG 案例
  debug?: boolean;
}

// AI返回结果接口
interface AIResult {
  title: string;
  theme: string;
  intensity: string;
  segments?: PlanSection[];
  sections?: PlanSection[];
  notes: string;
}

// API响应接口
interface APIResponse {
  success: boolean;
  plan: TrainingPlanOutput;
  debug?: {
    totalPlansInDb: number;
    keyword: string;
    matched: LessonPlan[];
  };
}

// 验证和修正AI生成的活动数据
function validateAndFixActivity(activity: any, category: string): any {
  const fixed = { ...activity };

  // 确保所有必需字段存在
  if (!fixed.sets) {
    fixed.sets = '2-3组';
  }
  if (!fixed.repetitions) {
    // 根据活动类型设置默认次数
    if (fixed.name.includes('运球') || fixed.name.includes('传球')) {
      fixed.repetitions = '每组30秒或20次';
    } else if (fixed.name.includes('拉伸') || fixed.name.includes('伸展')) {
      fixed.repetitions = '每组8-10次或20秒';
    } else {
      fixed.repetitions = '每组8-10次';
    }
  }
  if (!fixed.progression) {
    fixed.progression = '基础：标准动作练习 → 进阶：增加速度/难度 → 挑战：结合其他动作组合练习';
  }
  if (!fixed.drillDiagram || fixed.drillDiagram === '<svg>...</svg>' || !fixed.drillDiagram.includes('<svg')) {
    // 生成默认SVG图解
    fixed.drillDiagram = generateDefaultDrillDiagram(category, fixed.form);
  }

  return fixed;
}

// 生成默认的SVG图解
function generateDefaultDrillDiagram(category: string, form: string): string {
  const formType = form || '集体';

  // 基础模板
  let svg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="red" /></marker></defs>`;
  svg += `<rect x="20" y="20" width="360" height="260" stroke="black" fill="none" stroke-width="2"/>`;

  if (formType.includes('分组')) {
    // 分组训练示意图
    const groups = 3;
    for (let i = 0; i < groups; i++) {
      const x = 80 + i * 100;
      // 学员
      svg += `<circle cx="${x}" cy="120" r="8" fill="blue"/><text x="${x - 3}" y="124" font-size="10" fill="white" font-weight="bold">${i * 3 + 1}</text>`;
      svg += `<circle cx="${x - 20}" cy="150" r="8" fill="blue"/><text x="${x - 23}" y="154" font-size="10" fill="white" font-weight="bold">${i * 3 + 2}</text>`;
      svg += `<circle cx="${x + 20}" cy="150" r="8" fill="blue"/><text x="${x + 17}" y="154" font-size="10" fill="white" font-weight="bold">${i * 3 + 3}</text>`;
      // 球
      svg += `<circle cx="${x}" cy="135" r="3" fill="orange"/>`;
    }
  } else if (formType.includes('排面')) {
    // 排面训练示意图
    const rows = 3;
    const cols = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = 80 + c * 60;
        const y = 100 + r * 40;
        svg += `<circle cx="${x}" cy="${y}" r="8" fill="blue"/><text x="${x - 3}" y="${y + 4}" font-size="10" fill="white" font-weight="bold">${r * cols + c + 1}</text>`;
      }
    }
  } else {
    // 集体训练示意图
    svg += `<circle cx="200" cy="150" r="8" fill="red"/><text x="197" y="154" font-size="10" fill="white" font-weight="bold">教</text>`;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * 2 * Math.PI;
      const x = 200 + Math.cos(angle) * 80;
      const y = 150 + Math.sin(angle) * 80;
      svg += `<circle cx="${x}" cy="${y}" r="8" fill="blue"/><text x="${x - 3}" y="${y + 4}" font-size="10" fill="white" font-weight="bold">${i + 1}</text>`;
    }
  }

  svg += `<text x="200" y="280" text-anchor="middle" font-size="12" fill="#333">${formType} - ${category}</text>`;
  svg += `</svg>`;

  return svg;
}

// 验证和修正整个教案
function validateAndFixPlan(plan: any, duration: number): any {
  const fixed = { ...plan };
  const sections = fixed.segments || fixed.sections || [];

  // 验证所有节次的活动
  sections.forEach((section: any, sectionIndex: number) => {
    const activities = section.activities || [];

    // ===== 全局强制规则 =====

    // 规则1：慢跑时间强制≤3分钟（适用于所有节次）
    activities.forEach((a: any) => {
      if (a.name && (a.name.includes('慢跑') || a.name.includes('跑步'))) {
        if (a.duration > 3) {
          console.warn(
            `⚠️ [第${sectionIndex + 1}节] 慢跑"${a.name}"时间${a.duration}分钟，强制调整为3分钟`
          );
          a.duration = 3;
        }
      }
    });

    // 规则2：第一节活动顺序强制检查
    if (sectionIndex === 0) {
      const firstSectionTotal = activities.reduce(
        (sum: number, a: any) => sum + (a.duration || 0),
        0
      );
      if (firstSectionTotal > 30) {
        console.warn(`⚠️ 第一节总时长${firstSectionTotal}分钟，超过30分钟限制，按比例压缩`);
        const ratio = 30 / firstSectionTotal;
        activities.forEach((a: any) => {
          a.duration = Math.max(1, Math.round(a.duration * ratio));
        });
      }
    }

    // 规则3：修正所有活动的缺失字段
    section.activities = activities.map((activity: any) => {
      let category = 'general';
      if (activity.name) {
        if (activity.name.includes('礼仪')) category = 'etiquette';
        else if (activity.name.includes('慢跑')) category = 'warmup_jog';
        else if (activity.name.includes('拉伸') || activity.name.includes('伸展'))
          category = 'dynamic_stretch';
        else if (activity.name.includes('协调')) category = 'coordination';
        else if (activity.name.includes('球性')) category = 'ball_familiarity';
        else if (
          activity.name.includes('运球') ||
          activity.name.includes('传球') ||
          activity.name.includes('投篮')
        )
          category = 'technical';
        else if (activity.name.includes('比赛') || activity.name.includes('对抗'))
          category = 'game';
        else if (activity.name.includes('放松') || activity.name.includes('拉伸'))
          category = 'cooldown';
      }

      return validateAndFixActivity(activity, category);
    });
  });

  // 确保trainingProgression字段存在
  if (!fixed.trainingProgression) {
    fixed.trainingProgression = '本节课训练内容从基础到实战的完整递进设计';
  }

  return fixed;
}

// ============================================================
// 三段式教案结构（优化版：每30分钟一节）
// 第一节（30分钟）：准备热身部分（礼仪→慢跑≤3分钟→动态伸展→协调性→球性）
// 第二节（duration-60分钟）：正式训练部分
// 第三节（30分钟）：对抗比赛 + 放松
// ============================================================

function generateSegmentStructure(duration: number): Array<{
  name: string;
  minutes: number;
  categories: string[];
  description: string;
}> {
  const first = 30;
  const last = 30;
  const middle = Math.max(30, duration - first - last);

  return [
    {
      name: '第一节',
      minutes: first,
      categories: [
        'etiquette',
        'warmup_jog',
        'dynamic_stretch',
        'coordination',
        'ball_familiarity',
      ],
      description: '准备热身：课前礼仪 → 慢跑热身（≤3分钟） → 动态伸展 → 身体协调性 → 球性熟悉',
    },
    {
      name: '第二节',
      minutes: middle,
      categories: ['technical', 'physical', 'tactical'],
      description: '正式训练：技术训练 → 体能训练 → 战术训练（根据skillLevel调整难度，递进式设计）',
    },
    {
      name: '第三节',
      minutes: last,
      categories: ['game', 'cooldown'],
      description: '对抗比赛 + 放松总结',
    },
  ];
}

// U10三级版说明
const u10LevelGuide: Record<string, string> = {
  基础: '初次接触篮球，动作以模仿为主，难度最低，对抗少',
  进阶: '有一定篮球基础，可进行标准动作训练，有少量对抗',
  精英: '技术较成熟，可进行组合动作训练，有正式对抗比赛',
};

// 生成Prompt
function generatePrompt(params: AIPlanParams, cases: LessonPlan[]): string {
  const ageGroupInfo: Record<string, string> = {
    U6: '4-6岁幼儿班，以游戏为主，培养球性和兴趣',
    U8: '7-8岁小学低年级，基础运球、传球入门',
    U10: '9-10岁小学中年级，技术规范化，开始体能训练',
    U12: '11-12岁小学高年级，战术训练，加强对抗',
    U14: '13-14岁初中，综合提升，中考体育',
  };

  const segments = generateSegmentStructure(params.duration);
  const isU10 = params.group === 'U10';
  const levelLabel =
    isU10 && params.skillLevel
      ? params.skillLevel === 'beginner'
        ? '基础'
        : params.skillLevel === 'intermediate'
          ? '进阶'
          : '精英'
      : '';

  // RAG 案例整理
  const casesText =
    cases.length > 0
      ? cases
          .map(
            (c, i) =>
              `案例${i + 1} [${c.age_group} ${c.class_level} ${c.month}] ${c.section}-${c.part}: ${c.method}（要点：${c.key_points}）`
          )
          .join('\n')
      : '';

  // 难度级别描述（U10三级版）
  const levelDesc = isU10
    ? `\n## U10级别说明（${levelLabel}）\n${u10LevelGuide[levelLabel] || ''}\n`
    : '';

  // 训练节次结构
  const segmentDesc = segments
    .map(s => `- ${s.name}（${s.minutes}分钟）：${s.description}`)
    .join('\n');

  return `你是一位专业的篮球青训教练，请根据以下要求生成篮球训练教案。

## 学员信息
- 年龄段：${params.group}（${ageGroupInfo[params.group] || ''}）
- 训练时长：${params.duration}分钟（分为三节：前30分钟准备热身，中间正式训练，后30分钟对抗比赛）
- 训练场地：${params.location}
- 天气：${params.weather || '未指定'}
- 学员人数：${params.playerCount || '8-12'}人${levelDesc}

## 训练节次结构
${segmentDesc}

## 训练要求
- 训练主题：${params.theme || '根据年龄段特点自动确定'}
- 重点训练技能：${params.focusSkills?.join('、') || '根据年龄段特点自动确定'}
- 技能水平：${isU10 ? levelLabel + '（' + u10LevelGuide[levelLabel] + '）' : params.skillLevel || 'intermediate'}
${params.previousTraining?.length ? `- 最近训练内容：${params.previousTraining.join('、')}（避免重复或进阶）` : ''}

${casesText ? `## 参考案例（来自真实教学数据）\n${casesText}\n` : ''}

## 输出格式（严格JSON）
{
  "title": "教案标题（包含年龄段、主题、级别）",
  "theme": "训练主题",
  "objective": "训练目标（1-2句话）",
  "level": "${isU10 ? levelLabel : 'N/A'}",
  "intensity": "low/medium/high",
  "segments": [
    {
      "name": "第一节",
      "duration": 30,
      "activities": [
        {
          "name": "活动名称（必须精确，如\"右手原地高低运球\"）",
          "duration": 5,  // 慢跑活动必须≤3！其他活动自由分配，但第一节总时长=30
          "form": "组织形式（必须具体：集体/分组（几人一组）/排面（几排）/依次（轮流））",
          "description": "【队形】【位置】【具体动作】用简洁专业的中文描述。例如：\"【排面】所有学员在中场线排好。【位置】教练在前方示范。【动作】双手放肩膀上，向前绕环走到对面底线，再向后绕环返回起点。\"",
          "keyPoints": ["要点1", "要点2"],
          "sets": "2-3组（必须填写具体组数）",
          "repetitions": "每组8-10次或30秒（必须填写具体次数或时间）",
          "progression": "从易到难的3个层次：1.基础动作（简单模仿）→ 2.进阶动作（增加难度）→ 3.挑战动作（组合运用）（必须明确写出3个层次）",
          "equipment": ["器材（如有）"],
          "drillDiagram": "<svg>...</svg> 动作路线示意图（必须包含：学员圆圈+编号蓝色、教练方块红色、球橙色圆点、箭头路线）"
        }
      ],
      "points": ["本节要点1", "本节要点2"]
    },
    {
      "name": "第二节",
      "duration": ${segments[1].minutes},
      "activities": [...],
      "points": [...]
    },
    {
      "name": "第三节",
      "duration": 30,
      "activities": [...],
      "points": [...]
    }
  ],
  "notes": "安全注意事项",
  "trainingProgression": "整体递进关系说明：热身中的基础动作在正式训练中如何进阶（必须明确写出前后关联）"
}

## 关键要求（严格按照以下5点执行）

### 1. 第一节顺序要求（重点⚠️）
**必须按此顺序生成4-5个活动，严格按照标注的时间：**
1. **课前礼仪**（2分钟）：集合、点名、讲解本节课内容
2. **慢跑热身**（严格≤3分钟，duration必须设为2或3）：绕场慢跑1-2圈，最多3分钟，绝对不能超过3分钟。此条为硬性规则，违反将导致教案作废。
3. **动态伸展**（5-8分钟）：肩关节、髋关节、膝关节、踝关节动态拉伸
4. **身体协调性**（5-8分钟）：绳梯、侧滑步、交叉步、小碎步等
5. **球性熟悉**（8-10分钟）：原地运球、移动运球、球绕环等

### 2. 具体动作和组织形式要求
**不能笼统描述，必须具体：**
- ❌ 错误示例："原地运球"
- ✅ 正确示例："右手原地高低运球：膝盖微屈，右手在体侧运球，高度在膝盖到腰部之间，眼睛看前方，左右手各30秒"

**组织形式必须明确：**
- 写明：集体/分组（几人一组）/排面（几排）/依次（轮流）/轮换
- 示例："排面（3排，每排4人）→ 分组（2人一组）→ 依次（每人轮流做）"

### 3. 组数、次数、递进式要求
**每个练习必须包含：**
- **组数**："2-3组"
- **次数/时间**："每组30秒"或"每组8-10次"
- **递进式设计**：明确写出从易到难的3个层次
  - 示例：
    - 基础：原地高低运球（熟悉球性）
    - 进阶：行进间直线运球（结合脚步）
    - 挑战：行进间变向运球（增加难度）

### 4. 图片生成要求（SVG战术图解）
**用SVG格式生成动作路线示意图，包含：**
- 学员位置（圆圈+编号，蓝色）
- 教练位置（方块，红色）
- 球的位置（小圆点，橙色）
- 动作路线（箭头+虚线，红色）
- 场地标志（中线、边线等）

**SVG示例模板：**
使用标准的SVG格式，包含场地、球员、教练、球和移动路线的基本元素。

### 5. 前后关联要求（重点）
**今天的重点训练内容，必须在热身时有体现：**

**示例（如果重点是"体前变向运球"）：**
- **热身球性练习**：原地体前左右手交替运球（基础变向动作）
- **正式训练**：行进间体前变向运球（标准变向）
- **对抗比赛**：实战中的体前变向突破（应用变向）

**在"trainingProgression"字段中明确写出：**
trainingProgression字段必须包含完整的前后关联说明，例如：本节课重点训练XX技能，热身环节通过XX（基础动作），正式训练环节进行XX（标准动作），对抗比赛环节在XX（实战应用），实现从基础到实战的完整递进。

### 其他要求
1. 活动描述只写【队形】【位置】【具体动作】，不要教练引导语
2. 每节包含2-4个活动，总时长严格=${params.duration}分钟
3. 队形描述使用：排面/列队/分组/圆形/菱形/方形等
4. ${params.location === '室外' && params.weather === '雨天' ? '雨天室外注意安全，可改为室内或减少对抗环节' : ''}
${casesText ? '5. 参考案例库的训练方法格式' : ''}
`.trim();
}

// 调用 AI API（通用函数，支持 Kimi 和 MiniMax）
async function callAIAPI(
  apiKey: string,
  apiUrl: string,
  model: string,
  prompt: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  const systemPrompt =
    '你是一位专业的篮球青训教练，擅长根据不同年龄段学员的特点设计科学、有趣、有效的训练教案。请严格按照要求的JSON格式输出教案内容。';

  const postData = JSON.stringify({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 8000,
  });

  return new Promise(resolve => {
    const url = new URL(apiUrl);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData),
      },
      agent: new https.Agent({ rejectUnauthorized: false }),
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            const content = jsonData.choices?.[0]?.message?.content;
            if (content) {
              resolve({ success: true, content });
            } else {
              resolve({ success: false, error: 'AI返回内容为空' });
            }
          } catch (e) {
            resolve({ success: false, error: '解析AI响应失败' });
          }
        } else {
          try {
            const errData = JSON.parse(data);
            resolve({
              success: false,
              error: errData.error?.message || `HTTP ${res.statusCode}`,
            });
          } catch {
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
          }
        }
      });
    });

    req.on('error', e => {
      resolve({ success: false, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

export async function POST(request: NextRequest) {
  try {
    const params: AIPlanParams = await request.json();

    // 获取 API 配置
    // 主要: Kimi (Moonshot)
    const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
    // 备用: MiniMax
    const MINIMAX_API_KEY =
      process.env.MINIMAX_API_KEY || process.env.NEXT_PUBLIC_MINIMAX_API_KEY || '';

    // RAG: 检索相似案例
    // keyword 合并 theme 和 focusSkills，category 留空让 keyword 全局搜索
    const searchKeyword = [params.theme, ...(params.focusSkills || [])].filter(Boolean).join(' ');
    const similarCases = retrieveSimilarCases({
      ageGroup: params.group,
      keyword: searchKeyword || undefined,
      limit: 5,
    });

    // 调试日志：输出检索到的案例
    console.log('=== RAG 案例检索 ===');
    console.log('检索参数:', {
      ageGroup: params.group,
      keyword: params.theme,
      category: params.focusSkills?.[0],
    });
    console.log('检索到案例数:', similarCases.length);
    similarCases.forEach((c, i) => {
      console.log(`案例${i + 1}: [${c.age_group} ${c.tech_type}] ${c.method?.substring(0, 80)}...`);
    });
    console.log('====================');

    const prompt = generatePrompt(params, similarCases);

    // 优先使用 Kimi
    if (KIMI_API_KEY) {
      const kimiResult = await callAIAPI(
        KIMI_API_KEY,
        'https://api.moonshot.cn/v1/chat/completions',
        'moonshot-v1-8k',
        prompt
      );

      if (kimiResult.success && kimiResult.content) {
        // 解析并返回
        const jsonContent = kimiResult.content
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        const aiResult = JSON.parse(jsonContent);

        // 验证并修正AI生成的数据
        const validatedResult = validateAndFixPlan(aiResult, params.duration);

        const planOutput: TrainingPlanOutput = {
          title: validatedResult.title,
          date: new Date().toISOString().split('T')[0],
          duration: params.duration,
          group: params.group as 'U6' | 'U8' | 'U10' | 'U12' | 'U14',
          location: params.location as '室内' | '室外',
          weather: params.weather,
          theme: validatedResult.theme,
          focusSkills: params.focusSkills || [],
          intensity: validatedResult.intensity,
          // 兼容 segments（新三段式）和 sections（旧格式）
          sections: (validatedResult.segments || validatedResult.sections || []).map(
            (seg: any) => ({
              ...seg,
              // 移除 coachGuide 字段（不再展示）
              activities: seg.activities?.map((act: any) => {
                const { coachGuide, ...rest } = act;
                return rest;
              }),
            })
          ),
          notes: validatedResult.notes,
          trainingProgression: validatedResult.trainingProgression,
        };

        // 返回结果（支持调试模式）
        const response: APIResponse = { success: true, plan: planOutput };

        // 如果是调试模式，返回检索到的案例
        if (params.debug) {
          response.debug = {
            totalPlansInDb: allPlans.length,
            keyword: searchKeyword,
            matched: similarCases,
          };
        }

        return NextResponse.json(response);
      }

      console.log('Kimi API 失败，尝试 MiniMax:', kimiResult.error);
    }

    // 备用: 使用 MiniMax
    if (MINIMAX_API_KEY) {
      const miniMaxResult = await callAIAPI(
        MINIMAX_API_KEY,
        'https://api.minimax.chat/v1/text/chatcompletion_v2',
        'MiniMax-Text-01',
        prompt
      );

      if (miniMaxResult.success && miniMaxResult.content) {
        const jsonContent = miniMaxResult.content
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        const aiResult = JSON.parse(jsonContent);

        // 验证并修正AI生成的数据
        const validatedResult = validateAndFixPlan(aiResult, params.duration);

        const planOutput: TrainingPlanOutput = {
          title: validatedResult.title,
          date: new Date().toISOString().split('T')[0],
          duration: params.duration,
          group: params.group as 'U6' | 'U8' | 'U10' | 'U12' | 'U14',
          location: params.location as '室内' | '室外',
          weather: params.weather,
          theme: validatedResult.theme,
          focusSkills: params.focusSkills || [],
          intensity: validatedResult.intensity,
          // 兼容 segments（新三段式）和 sections（旧格式）
          sections: (validatedResult.segments || validatedResult.sections || []).map(
            (seg: any) => ({
              ...seg,
              // 移除 coachGuide 字段（不再展示）
              activities: seg.activities?.map((act: any) => {
                const { coachGuide, ...rest } = act;
                return rest;
              }),
            })
          ),
          notes: validatedResult.notes,
          trainingProgression: validatedResult.trainingProgression,
        };

        // 返回结果（支持调试模式）
        const response: APIResponse = { success: true, plan: planOutput };

        // 如果是调试模式，返回检索到的案例
        if (params.debug) {
          response.debug = {
            totalPlansInDb: allPlans.length,
            keyword: searchKeyword,
            matched: similarCases,
          };
        }

        return NextResponse.json(response);
      }

      return NextResponse.json(
        { success: false, error: `AI生成失败: ${miniMaxResult.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: '未配置 AI API 密钥，请联系管理员' },
      { status: 500 }
    );
  } catch (error) {
    console.error('AI生成教案失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: `AI生成教案失败: ${error instanceof Error ? error.message : '未知错误'}`,
      },
      { status: 500 }
    );
  }
}
