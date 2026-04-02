import { TrainingPlanOutput, AgeGroup, Location } from './plan-generator';

// AI生成参数
export interface AIPlanParams {
  group: AgeGroup;
  duration: number;
  location: Location;
  weather?: string;
  theme?: string;
  focusSkills?: string[];
  additionalNotes?: string;
  playerCount?: number;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  previousTraining?: string[];
}

// AI生成提示词
function generatePrompt(params: AIPlanParams): string {
  const ageGroupInfo = {
    U6: '4-6岁幼儿班，以游戏为主，培养球性和兴趣',
    U8: '7-8岁小学低年级，基础运球、传球入门',
    U10: '9-10岁小学中年级，技术规范化，开始体能训练',
    U12: '11-12岁小学高年级，战术训练，加强对抗',
    U14: '13-14岁初中，综合提升，中考体育',
  };

  const prompt = `你是一位专业的篮球青训教练，请为以下学员生成一份篮球训练教案：

## 学员信息
- 年龄段：${params.group} (${ageGroupInfo[params.group]})
- 训练时长：${params.duration}分钟
- 训练场地：${params.location}
- 天气：${params.weather || '未指定'}
- 学员人数：${params.playerCount || 8 - 12}人
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
      "name": "环节名称（如：课前礼仪、热身部分、技术训练等）",
      "category": "环节类别（etiquette/warmup/ball_familiarity/technical/physical/tactical/game/cooldown）",
      "duration": 10,
      "activities": [
        {
          "name": "活动名称",
          "duration": 5,
          "description": "活动描述（20-50字）",
          "keyPoints": ["要点1", "要点2"],
          "equipment": ["所需器材"],
          "form": "组织形式（集体/分组/依次等）"
        }
      ],
      "points": ["环节要点1", "环节要点2"]
    }
  ],
  "notes": "注意事项和提醒"
}

## 注意事项
1. 训练时长严格按照${params.duration}分钟分配
2. 活动要适合该年龄段，${params.group === 'U6' ? '以游戏和趣味性为主' : params.group === 'U8' ? '注重基础技能培养' : '可以增加技术难度和对抗强度'}
3. 每个环节2-4个活动
4. 活动描述要具体可执行
5. ${params.location === '室外' ? '如为雨天，建议调整适合室内或遮蔽场地的内容' : ''}
6. ${params.weather === '晴天' ? '注意安排休息和补水' : params.weather === '雨天' ? '避免滑倒，安全第一' : ''}`;

  return prompt;
}

// 调用AI生成教案
export async function generateAIPlan(params: AIPlanParams): Promise<TrainingPlanOutput> {
  const prompt = generatePrompt(params);

  try {
    // 调用 Kimi API（月之暗面）
    const API_KEY = process.env.NEXT_PUBLIC_KIMI_API_KEY || 'your-kimi-api-key';
    const API_URL = 'https://api.moonshot.cn/v1/chat/completions';

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [
          {
            role: 'system',
            content:
              '你是一位专业的篮球青训教练，擅长根据不同年龄段学员的特点设计科学、有趣、有效的训练教案。请严格按照要求的JSON格式输出教案内容。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Kimi API 错误: ${errorData.error?.message || '未知错误'}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('AI返回的内容为空');
    }

    // 解析AI返回的JSON
    // 移除可能存在的markdown代码块标记
    const jsonContent = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    const aiResult = JSON.parse(jsonContent);

    // 转换为标准格式
    const planOutput: TrainingPlanOutput = {
      title: aiResult.title,
      date: new Date().toISOString().split('T')[0],
      duration: params.duration,
      group: params.group,
      location: params.location,
      weather: params.weather,
      theme: aiResult.theme,
      focusSkills: params.focusSkills || [],
      intensity: aiResult.intensity,
      sections: aiResult.sections,
      notes: aiResult.notes,
    };

    return planOutput;
  } catch (error) {
    console.error('AI生成教案失败:', error);
    throw new Error(`AI生成教案失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// 获取AI生成配置
export function getAIGenerationConfig() {
  return {
    enabled: true, // 是否启用AI生成
    defaultModel: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
  };
}
