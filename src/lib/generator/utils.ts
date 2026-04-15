// ============================================// 教案生成引擎 - 辅助函数// ============================================
import type { TrainingActivity, SectionActivity, AgeGroup, Location } from './types';

// 选择合适的活动
export function selectActivities(
  pool: Omit<TrainingActivity, 'id'>[],
  maxDifficulty: number,
  targetDuration: number,
  preferredCategories: string[]
): SectionActivity[] {
  const result: SectionActivity[] = [];
  let usedTime = 0;

  // 优先选择匹配类别的活动
  const preferred = pool.filter(
    (a) =>
      a.difficulty <= maxDifficulty &&
      (preferredCategories.includes(a.category) || preferredCategories.length === 0)
  );

  const others = pool.filter(
    (a) => a.difficulty <= maxDifficulty && !preferredCategories.includes(a.category)
  );

  const sorted = [...preferred, ...others];

  for (const activity of sorted) {
    if (usedTime + activity.duration > targetDuration + 3) continue;
    if (result.length >= 4) break;

    result.push({
      name: activity.name,
      duration: activity.duration,
      description: activity.description,
      keyPoints: activity.keyPoints || [],
      equipment: activity.equipment,
      form: activity.form,
      coachGuide: activity.coachGuide,
    });
    usedTime += activity.duration;
  }

  // 如果时间不够，调整最后一个活动
  if (usedTime < targetDuration - 2 && result.length > 0) {
    const lastActivity = result[result.length - 1];
    lastActivity.duration = targetDuration - (usedTime - lastActivity.duration);
  }

  return result;
}

// 生成备注
export function generateNotes(
  group: AgeGroup,
  location: Location,
  weather: string | undefined
): string {
  const notes: string[] = [];

  // 年龄段注意事项
  if (group === 'U6') {
    notes.push('幼儿班以游戏为主，注意时长控制');
    notes.push('多鼓励、少批评，保护孩子自信心');
    notes.push('每5-8分钟休息一次');
  } else if (group === 'U8') {
    notes.push('加强球性熟悉，注意手部力量训练');
    notes.push('培养基本功，循序渐进');
  } else if (group === 'U10') {
    notes.push('开始加入体能训练');
    notes.push('技术动作规范化');
  }

  // 场地天气
  if (location === '室外') {
    if (weather === '晴天') {
      notes.push('注意防晒，每15分钟补充水分');
      notes.push('避免长时间阳光直射');
    }
    if (weather === '阴天') {
      notes.push('注意保暖，活动后及时穿衣');
    }
    if (weather === '雨天') {
      notes.push('建议改室内，或减少对抗');
      notes.push('注意场地湿滑');
    }
  }

  // 安全提示
  notes.push('训练前检查场地，确保无安全隐患');
  notes.push('准备急救箱');
  notes.push('关注学员状态，及时调整强度');

  return notes.join('；');
}

// 获取主题名称映射
export function getThemeNames(): Record<string, string> {
  return {
    运球基础: '运球进阶',
    传球技术: '传球配合',
    投篮训练: '投篮强化',
    防守入门: '防守提升',
    进攻战术: '进攻战术',
    防守战术: '防守体系',
    体能训练: '体能强化',
    综合训练: '综合训练',
    对抗比赛: '实战对抗',
    考核评估: '技能考核',
    球性熟悉: '球性培养',
    中考体育: '体测训练',
  };
}
