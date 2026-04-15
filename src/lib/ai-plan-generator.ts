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
  caseExamples?: string; // 案例库检索到的参考案例（纯文本）
}

// AI生成提示词
function generatePrompt(params: AIPlanParams): string {
  const ageGroupInfo = {
    U6: '4-6岁幼儿班，注意力短暂，以游戏为主，培养球性和兴趣。每个动作不超过3分钟，多重复少讲解。热身用模仿秀（木头人、动物爬行），运球只做原地高低运球和拉球，投篮只做无球脚步模仿。对抗用投篮小游戏、接力赛代替。教练多鼓励、多击掌。',
    U8: '7-8岁小学低年级，可进行基础技术训练。运球：行进间运球、基础体前变向、运双球。传球：双手胸前传球、击地传球。投篮：三步上篮脚步+持球上篮。体能：绳梯、侧滑步。有少量对抗（2v2），重点培养基本功和比赛兴趣。',
    U10: '9-10岁小学中年级，技术规范化，开始体能训练。运球：体前变向、胯下运球、运双球。传球：行进间传接球、移动传球。投篮：接球上篮、基础投篮训练。体能：绳梯进阶、敏捷梯。有正式对抗（3v3），强调规则和基础战术配合。',
    U12: '11-12岁小学高年级，接近比赛水平。运球：组合运球（体前+胯下+背后）、运球突破。传球：快攻传球、行进间不停球传球。投篮：急停投篮、接球投篮、三威胁衔接。防守：防有球/无球、人球兼顾。正式全场对抗（4v4/5v5），有战术配合和位置训练。',
    U14: '13-14岁初中，接近成人比赛。全面技术：四项组合运球、运球衔接突破上篮/急停投篮、全场快攻、半场阵地战术、1v1-5v5对抗。体能：自重力量训练+专项体能。防守：全场紧逼、半场联防/人盯人。强度高、时间长的正式比赛。',
  };

  const skillLevelInfo = {
    beginner: '基础水平，初次接触篮球，以模仿、游戏为主，注重兴趣培养和基础动作',
    intermediate: '进阶水平，有一定篮球基础，开始技术规范化训练，注重动作质量和连贯性',
    advanced: '精英水平，技术较成熟，接近比赛水平，注重实战应用和战术配合',
  };

  const intensityInfo = {
    low: '低强度：以游戏化、趣味性为主，训练量小，组间休息充分，适合恢复性训练或初次接触的学员',
    medium: '中强度：正常训练节奏，适度休息，适合日常训练，技术动作规范为主',
    high: '高强度：训练量较大，组间休息较短，适合有一定基础的学员，注重专项提升',
  };

  const prompt = `你是一位专业的篮球青训教练，拥有丰富的青少年篮球训练经验，请为以下学员生成一份科学、专业、有趣的篮球训练教案：

## 学员信息
- 年龄段：${params.group} (${ageGroupInfo[params.group]})
- 训练时长：${params.duration}分钟
- 训练场地：${params.location}
- 天气：${params.weather || '未指定'}
- 学员人数：${params.playerCount || 8 - 12}人
- 技能水平：${params.skillLevel || 'intermediate'} (${skillLevelInfo[params.skillLevel || 'intermediate']})

## 训练要求
- 训练主题：${params.theme || '根据年龄段特点自动确定'}
- 重点训练技能：${params.focusSkills?.join('、') || '根据年龄段特点自动确定'}
${params.additionalNotes ? `- 其他要求：${params.additionalNotes}` : ''}
${params.previousTraining?.length ? `- 最近训练内容：${params.previousTraining.join('、')}（请避免重复或进行进阶训练）` : ''}

## 教案结构要求
1. **整体结构**：采用三段式结构
   - 第一节（30分钟）：准备热身（礼仪→慢跑≤3分钟→动态伸展→协调性→球性）
   - 第二节（${Math.max(30, params.duration - 60)}分钟）：正式训练（技术训练→体能训练→战术训练）
   - 第三节（30分钟）：对抗比赛 + 放松总结

2. **活动设计**：
   - 每个环节2-4个活动，活动描述具体可执行
   - 包含详细的动作要领、训练方法和教练引导语
   - 体现递进式设计，从基础到进阶
   - 针对不同年龄段和技能水平调整难度

3. **专业要求**：
   - 技术动作规范，符合青少年身体发育特点
   - 训练强度适中，避免过度疲劳
   - 注重趣味性和互动性，保持学员积极性
   - 强调安全第一，避免受伤

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
          "description": "详细的活动描述，包含动作要领和训练方法",
          "keyPoints": ["要点1", "要点2", "要点3"],
          "equipment": ["所需器材"],
          "form": "组织形式（集体/分组/依次等）",
          "sets": "组数",
          "repetitions": "次数/时间",
          "progression": "递进式说明（从易到难）",
          "coachGuide": "教练引导语"
        }
      ],
      "points": ["环节要点1", "环节要点2"]
    }
  ],
  "notes": "注意事项和提醒",
  "trainingProgression": "训练递进关联说明（前后环节的逻辑关系）"
}

## 注意事项
1. 训练时长严格按照${params.duration}分钟分配，各环节时间合理
2. 活动要适合该年龄段和技能水平，体现年龄特点
3. 重点训练技能要在正式训练环节充分体现
4. ${params.location === '室外' ? '如为雨天，建议调整适合室内或遮蔽场地的内容' : ''}
5. ${params.weather === '晴天' ? '注意安排休息和补水' : params.weather === '雨天' ? '避免滑倒，安全第一' : ''}
6. 教案内容要具体、可操作，教练可以直接按照教案执行
7. 体现专业性和科学性，符合青少年篮球训练规律
${
  params.caseExamples
    ? `

## 参考案例（来自案例库，请参考但不要照搬）
${params.caseExamples}
请参考以上案例的训练方法、要点和教练引导语，结合本次训练要求生成教案。可以借鉴好的训练设计，但要根据实际学员情况调整难度和内容。`
    : ''
}`;

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
