import { NextRequest, NextResponse } from 'next/server'
import { TrainingPlanOutput } from '@/lib/plan-generator'
import { retrieveSimilarCases, allPlans } from '@/lib/cases'
import https from 'https'

// AI生成参数
interface AIPlanParams {
  group: string
  duration: number
  location: string
  weather?: string
  theme?: string
  focusSkills?: string[]
  additionalNotes?: string
  playerCount?: number
  skillLevel?: 'beginner' | 'intermediate' | 'advanced'
  previousTraining?: string[]
  // 调试参数：设为 true 时返回检索到的 RAG 案例
  debug?: boolean
}

// ============================================================
// 三段式教案结构（按用户要求：每30分钟一节）
// 第一节（30分钟）：准备热身部分
// 第二节（duration-60分钟）：正式训练部分
// 第三节（30分钟）：对抗比赛 + 放松
// ============================================================

function generateSegmentStructure(duration: number): Array<{ name: string; minutes: number; categories: string[]; description: string }> {
  const first = 30
  const last = 30
  const middle = Math.max(30, duration - first - last)

  return [
    {
      name: '第一节',
      minutes: first,
      categories: ['etiquette', 'warmup', 'ball_familiarity'],
      description: '准备热身：课前礼仪 → 慢跑热身 → 球性熟悉/柔韧拉伸'
    },
    {
      name: '第二节',
      minutes: middle,
      categories: ['technical', 'physical', 'tactical'],
      description: '正式训练：技术训练 → 体能训练 → 战术训练（根据skillLevel调整难度）'
    },
    {
      name: '第三节',
      minutes: last,
      categories: ['game', 'cooldown'],
      description: '对抗比赛 + 放松总结'
    }
  ]
}

// U10三级版说明
const u10LevelGuide: Record<string, string> = {
  '基础': '初次接触篮球，动作以模仿为主，难度最低，对抗少',
  '进阶': '有一定篮球基础，可进行标准动作训练，有少量对抗',
  '精英': '技术较成熟，可进行组合动作训练，有正式对抗比赛'
}

// 生成Prompt
function generatePrompt(params: AIPlanParams, cases: any[]): string {
  const ageGroupInfo: Record<string, string> = {
    'U6': '4-6岁幼儿班，以游戏为主，培养球性和兴趣',
    'U8': '7-8岁小学低年级，基础运球、传球入门',
    'U10': '9-10岁小学中年级，技术规范化，开始体能训练',
    'U12': '11-12岁小学高年级，战术训练，加强对抗',
    'U14': '13-14岁初中，综合提升，中考体育'
  }

  const segments = generateSegmentStructure(params.duration)
  const isU10 = params.group === 'U10'
  const levelLabel = isU10 && params.skillLevel
    ? (params.skillLevel === 'beginner' ? '基础' : params.skillLevel === 'intermediate' ? '进阶' : '精英')
    : ''

  // RAG 案例整理
  const casesText = cases.length > 0
    ? cases.map((c, i) => `案例${i + 1} [${c.age_group} ${c.class_level} ${c.month}] ${c.section}-${c.part}: ${c.method}（要点：${c.key_points}）`).join('\n')
    : ''

  // 难度级别描述（U10三级版）
  const levelDesc = isU10
    ? `\n## U10级别说明（${levelLabel}）\n${u10LevelGuide[levelLabel] || ''}\n`
    : ''

  // 训练节次结构
  const segmentDesc = segments.map(s =>
    `- ${s.name}（${s.minutes}分钟）：${s.description}`
  ).join('\n')

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
- 技能水平：${isU10 ? levelLabel + '（' + u10LevelGuide[levelLabel] + '）' : (params.skillLevel || 'intermediate')}
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
          "name": "活动名称",
          "duration": 5,
          "form": "组织形式（集体/分组/排面/依次）",
          "description": "【队形】【位置】【具体动作】，用简洁专业的中文描述。不要教练引导语，只要动作本身。例如：\"【排面】所有学员在中场线排好。【位置】教练在前方示范。【动作】双手放肩膀上，向前绕环走到对面底线，再向后绕环返回起点。\"",
          "keyPoints": ["要点1", "要点2"],
          "equipment": ["器材（如有）"]
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
  "notes": "安全注意事项"
}

## 关键要求
1. 严格按三节结构生成：第一节准备热身（礼仪+热身+球性）、第二节正式训练（技术+体能+战术）、第三节对抗比赛+放松
2. ${isU10 ? `必须根据【${levelLabel}】级别调整难度：基础版动作简单、无对抗；进阶版有标准动作和少量对抗；精英版有组合动作和正式对抗` : '根据年龄段调整技术难度和对抗强度'}
3. 活动描述只写【队形】【位置】【具体动作】，不要教练引导语
4. 每节包含2-4个活动，总时长严格=${params.duration}分钟
5. 队形描述使用：排面/列队/分组/圆形/菱形/方形等
6. ${params.location === '室外' && params.weather === '雨天' ? '雨天室外注意安全，可改为室内或减少对抗环节' : ''}
${casesText ? '7. 参考案例库的训练方法格式' : ''}`
}

// 调用 AI API（通用函数，支持 Kimi 和 MiniMax）
async function callAIAPI(
  apiKey: string,
  apiUrl: string,
  model: string,
  prompt: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  const systemPrompt = '你是一位专业的篮球青训教练，擅长根据不同年龄段学员的特点设计科学、有趣、有效的训练教案。请严格按照要求的JSON格式输出教案内容。'

  const postData = JSON.stringify({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 3000
  })

  return new Promise((resolve) => {
    const url = new URL(apiUrl)
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      agent: new https.Agent({ rejectUnauthorized: false })
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data)
            const content = jsonData.choices?.[0]?.message?.content
            if (content) {
              resolve({ success: true, content })
            } else {
              resolve({ success: false, error: 'AI返回内容为空' })
            }
          } catch (e) {
            resolve({ success: false, error: '解析AI响应失败' })
          }
        } else {
          try {
            const errData = JSON.parse(data)
            resolve({ success: false, error: errData.error?.message || `HTTP ${res.statusCode}` })
          } catch {
            resolve({ success: false, error: `HTTP ${res.statusCode}` })
          }
        }
      })
    })

    req.on('error', (e) => {
      resolve({ success: false, error: e.message })
    })

    req.write(postData)
    req.end()
  })
}

export async function POST(request: NextRequest) {
  try {
    const params: AIPlanParams = await request.json()

    // 获取 API 配置
    // 主要: Kimi (Moonshot)
    const KIMI_API_KEY = process.env.KIMI_API_KEY || ''
    // 备用: MiniMax
    const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || process.env.NEXT_PUBLIC_MINIMAX_API_KEY || ''

    // RAG: 检索相似案例
    // keyword 合并 theme 和 focusSkills，category 留空让 keyword 全局搜索
    const searchKeyword = [params.theme, ...(params.focusSkills || [])].filter(Boolean).join(' ');
    const similarCases = retrieveSimilarCases({
      ageGroup: params.group,
      keyword: searchKeyword || undefined,
      limit: 5
    })

    // 调试日志：输出检索到的案例
    console.log('=== RAG 案例检索 ===')
    console.log('检索参数:', { ageGroup: params.group, keyword: params.theme, category: params.focusSkills?.[0] })
    console.log('检索到案例数:', similarCases.length)
    similarCases.forEach((c, i) => {
      console.log(`案例${i+1}: [${c.age_group} ${c.tech_type}] ${c.method?.substring(0, 80)}...`)
    })
    console.log('====================')

    const prompt = generatePrompt(params, similarCases)

    // 优先使用 Kimi
    if (KIMI_API_KEY) {
      const kimiResult = await callAIAPI(
        KIMI_API_KEY,
        'https://api.moonshot.cn/v1/chat/completions',
        'moonshot-v1-8k',
        prompt
      )

      if (kimiResult.success && kimiResult.content) {
        // 解析并返回
        const jsonContent = kimiResult.content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        const aiResult = JSON.parse(jsonContent)

        const planOutput: TrainingPlanOutput = {
          title: aiResult.title,
          date: new Date().toISOString().split('T')[0],
          duration: params.duration,
          group: params.group as any,
          location: params.location as any,
          weather: params.weather,
          theme: aiResult.theme,
          focusSkills: params.focusSkills || [],
          intensity: aiResult.intensity,
          // 兼容 segments（新三段式）和 sections（旧格式）
          sections: (aiResult.segments || aiResult.sections || []).map((seg: any) => ({
            ...seg,
            // 移除 coachGuide 字段（不再展示）
            activities: seg.activities?.map((act: any) => {
              const { coachGuide, ...rest } = act
              return rest
            })
          })),
          notes: aiResult.notes
        }

        // 返回结果（支持调试模式）
        const response: any = { success: true, plan: planOutput }

        // 如果是调试模式，返回检索到的案例
        if (params.debug) {
          response.debug = {
            totalPlansInDb: allPlans.length,
            ageGroupCounts: {
              U6: allPlans.filter(p => p.age_group === 'U6').length,
              U8: allPlans.filter(p => p.age_group === 'U8').length,
              U10: allPlans.filter(p => p.age_group === 'U10').length,
              U12: allPlans.filter(p => p.age_group === 'U12').length,
              U14: allPlans.filter(p => p.age_group === 'U14').length,
            },
            retrievedCases: similarCases.map(c => ({
              age_group: c.age_group,
              class_level: c.class_level,
              section: c.section,
              tech_type: c.tech_type,
              method: c.method?.substring(0, 200),
              coach_guide: c.coach_guide?.substring(0, 100),
              key_points: c.key_points?.substring(0, 100)
            })),
            retrievalParams: {
              ageGroup: params.group,
              keyword: params.theme,
              searchKeyword: searchKeyword,
              category: params.focusSkills?.[0]
            }
          }
        }

        return NextResponse.json(response)
      }

      console.log('Kimi API 失败，尝试 MiniMax:', kimiResult.error)
    }

    // 备用: 使用 MiniMax
    if (MINIMAX_API_KEY) {
      const miniMaxResult = await callAIAPI(
        MINIMAX_API_KEY,
        'https://api.minimax.chat/v1/text/chatcompletion_v2',
        'MiniMax-Text-01',
        prompt
      )

      if (miniMaxResult.success && miniMaxResult.content) {
        const jsonContent = miniMaxResult.content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        const aiResult = JSON.parse(jsonContent)

        const planOutput: TrainingPlanOutput = {
          title: aiResult.title,
          date: new Date().toISOString().split('T')[0],
          duration: params.duration,
          group: params.group as any,
          location: params.location as any,
          weather: params.weather,
          theme: aiResult.theme,
          focusSkills: params.focusSkills || [],
          intensity: aiResult.intensity,
          // 兼容 segments（新三段式）和 sections（旧格式）
          sections: (aiResult.segments || aiResult.sections || []).map((seg: any) => ({
            ...seg,
            // 移除 coachGuide 字段（不再展示）
            activities: seg.activities?.map((act: any) => {
              const { coachGuide, ...rest } = act
              return rest
            })
          })),
          notes: aiResult.notes
        }

        // 返回结果（支持调试模式）
        const response: any = { success: true, plan: planOutput }

        // 如果是调试模式，返回检索到的案例
        if (params.debug) {
          response.debug = {
            // 获取总数据量
            totalPlansInDb: allPlans.length,
            // 各年龄组分布
            ageGroupCounts: {
              U6: allPlans.filter(p => p.age_group === 'U6').length,
              U8: allPlans.filter(p => p.age_group === 'U8').length,
              U10: allPlans.filter(p => p.age_group === 'U10').length,
              U12: allPlans.filter(p => p.age_group === 'U12').length,
              U14: allPlans.filter(p => p.age_group === 'U14').length,
            },
            // 检索到的案例
            retrievedCases: similarCases.map(c => ({
              age_group: c.age_group,
              class_level: c.class_level,
              section: c.section,
              tech_type: c.tech_type,
              method: c.method?.substring(0, 200),
              coach_guide: c.coach_guide?.substring(0, 100),
              key_points: c.key_points?.substring(0, 100)
            })),
            retrievalParams: {
              ageGroup: params.group,
              keyword: params.theme,
              searchKeyword: searchKeyword,
              category: params.focusSkills?.[0]
            }
          }
        }

        return NextResponse.json(response)
      }

      return NextResponse.json(
        { success: false, error: `AI生成失败: ${miniMaxResult.error}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: '未配置 AI API 密钥，请联系管理员' },
      { status: 500 }
    )

  } catch (error) {
    console.error('AI生成教案失败:', error)
    return NextResponse.json(
      { success: false, error: `AI生成教案失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    )
  }
}