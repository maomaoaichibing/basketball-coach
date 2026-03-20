import { NextRequest, NextResponse } from 'next/server'
import { TrainingPlanOutput } from '@/lib/plan-generator'
import { retrieveSimilarCases } from '@/lib/cases'
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

// AI生成提示词
function generatePrompt(params: AIPlanParams, cases: any[]): string {
  const ageGroupInfo: Record<string, string> = {
    'U6': '4-6岁幼儿班，以游戏为主，培养球性和兴趣',
    'U8': '7-8岁小学低年级，基础运球、传球入门',
    'U10': '9-10岁小学中年级，技术规范化，开始体能训练',
    'U12': '11-12岁小学高年级，战术训练，加强对抗',
    'U14': '13-14岁初中，综合提升，中考体育'
  }

  // 将案例格式化为参考文本
  const casesText = cases.length > 0
    ? `

## 参考案例（来自真实教学数据）
${cases.map((c, i) => `
案例${i + 1} [${c.age_group} ${c.class_level} ${c.month}]:
- 环节: ${c.section || '训练部分'}-${c.part || c.tech_type}
- 训练方法: ${c.method}
- 教练引导: ${c.coach_guide}
- 要点: ${c.key_points}
`).join('\n')}`
    : ''

  return `你是一位专业的篮球青训教练，请为以下学员生成一份详细的篮球训练教案：

## 学员信息
- 年龄段：${params.group} (${ageGroupInfo[params.group] || ''})
- 训练时长：${params.duration}分钟
- 训练场地：${params.location}
- 天气：${params.weather || '未指定'}
- 学员人数：${params.playerCount || '8-12'}人
- 技能水平：${params.skillLevel || 'intermediate'}

## 训练要求
- 训练主题：${params.theme || '根据年龄段特点自动确定'}
- 重点训练技能：${params.focusSkills?.join('、') || '根据年龄段特点自动确定'}
${params.additionalNotes ? `- 其他要求：${params.additionalNotes}` : ''}
${params.previousTraining?.length ? `- 最近训练内容：${params.previousTraining.join('、')}（请避免重复或进行进阶训练）` : ''}

## 输出要求
请按照以下JSON格式输出教案，确保JSON格式正确，不要包含任何其他文字：

{
  "title": "教案标题",
  "theme": "训练主题",
  "objective": "训练目标（1-2句话）",
  "intensity": "训练强度（low/medium/high）",
  "sections": [
    {
      "name": "环节名称",
      "category": "环节类别（etiquette/warmup/ball_familiarity/technical/physical/tactical/game/cooldown）",
      "duration": 10,
      "activities": [
        {
          "name": "活动名称",
          "duration": 5,
          "description": "详细训练步骤，格式：【队形】+【学员位置】+【具体动作】。例如：\"【排面】所有学员在中场线站好，教练与学员相对而站。【动作】双手放在肩膀上，向前绕环走到另一侧底线，然后向后绕环回到起点。\"",
          "keyPoints": ["要点1：具体说明要点", "要点2：具体说明要点", "要点3：具体说明要点"],
          "equipment": ["所需器材"],
          "form": "组织形式（集体/分组/Z型/排面/依次进行等）",
          "coachGuide": "教练员引导语，包含：1）开始前的说明话术；2）进行中的鼓励话术；3）结束后的点评话术。例如：\"XX小朋友们，今天我们来做XX游戏，首先...加油！...很好！...最后我们...\""
        }
      ],
      "points": ["环节整体要点1", "环节整体要点2"]
    }
  ],
  "notes": "注意事项和提醒"
}

## 注意事项
1. 训练时长严格按照${params.duration}分钟分配
2. 活动要适合该年龄段，${params.group === 'U6' ? '以游戏和趣味性为主' : params.group === 'U8' ? '注重基础技能培养' : '可以增加技术难度和对抗强度'}
3. 每个环节2-4个活动
4. 活动描述必须包含【队形】【位置】【具体动作】三个要素，格式参考案例库
5. ${params.location === '室外' ? '如为雨天，建议调整适合室内或遮蔽场地的内容' : ''}
6. ${params.weather === '晴天' ? '注意安排休息和补水' : params.weather === '雨天' ? '避免滑倒，安全第一' : ''}
${cases.length > 0 ? `7. 严格参考案例库的训练方法格式，生成类似的详细步骤` : ''}`
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
          sections: aiResult.sections,
          notes: aiResult.notes
        }

        // 返回结果（支持调试模式）
        const response: any = { success: true, plan: planOutput }

        // 如果是调试模式，返回检索到的案例
        if (params.debug) {
          response.debug = {
            retrievedCases: similarCases.map(c => ({
              age_group: c.age_group,
              class_level: c.class_level,
              section: c.section,
              tech_type: c.tech_type,
              method: c.method?.substring(0, 200),
              coach_guide: c.coach_guide?.substring(0, 100),
              key_points: c.key_points?.substring(0, 100)
            })),
            totalCasesInDb: similarCases.length > 0 ? '数据已加载' : '无数据',
            retrievalParams: {
              ageGroup: params.group,
              keyword: params.theme,
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
          sections: aiResult.sections,
          notes: aiResult.notes
        }

        // 返回结果（支持调试模式）
        const response: any = { success: true, plan: planOutput }

        // 如果是调试模式，返回检索到的案例
        if (params.debug) {
          response.debug = {
            retrievedCases: similarCases.map(c => ({
              age_group: c.age_group,
              class_level: c.class_level,
              section: c.section,
              tech_type: c.tech_type,
              method: c.method?.substring(0, 200),
              coach_guide: c.coach_guide?.substring(0, 100),
              key_points: c.key_points?.substring(0, 100)
            })),
            totalCasesInDb: similarCases.length > 0 ? '数据已加载' : '无数据',
            retrievalParams: {
              ageGroup: params.group,
              keyword: params.theme,
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