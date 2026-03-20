/**
 * 篮球教案案例库 - RAG数据加载模块
 * Phase 1: 基于字段匹配的快速检索
 *
 * 支持外部配置文件：
 * - 通过环境变量 LESSON_PLANS_PATH 指定外部数据文件路径
 * - 如果环境变量存在，从外部路径加载（热更新，无需重新部署）
 * - 如果环境变量不存在，使用内置的默认数据
 */

import plansData from './lesson_plans_raw.json';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface LessonPlan {
  class_level: string;    // 班级: "幼儿班", "小班", "中班", "大班"
  age_group: string;      // 年龄组: "U6", "U8", "U10", "U12", "U14"
  month: string;          // 月份: "4月", "2024年10月", "2023年暑期"
  sheet: string;          // Sheet名
  section: string;        // 部分: "准备部分", "训练部分", "结束部分"
  category: string;       // 分类: "warmup", "technical", "physical", "game", "cooldown"
  part: string;           // 具体环节
  duration: number;       // 时长(分钟)
  tech_type: string;      // 技术类型: "礼仪", "运球", "投篮", "体能"
  content: string;        // 主要内容
  game_name: string;      // 游戏名称
  form: string;           // 建议形式
  equipment: string;      // 使用教具
  method: string;         // 训练方法
  coach_guide: string;     // 教练员引导语
  key_points: string;     // 要点目的
}

// 转换为数组
// 支持外部配置文件热更新
function loadPlans(): LessonPlan[] {
  const externalPath = process.env.LESSON_PLANS_PATH;

  if (externalPath && existsSync(externalPath)) {
    try {
      const externalData = readFileSync(externalPath, 'utf-8');
      console.log(`[RAG] 已加载外部教案数据: ${externalPath}`);
      return JSON.parse(externalData);
    } catch (e) {
      console.error(`[RAG] 加载外部数据失败: ${e}，使用内置数据`);
    }
  }

  console.log(`[RAG] 使用内置教案数据 (${(plansData as LessonPlan[]).length} 条)`);
  return plansData as LessonPlan[];
}

const allPlans: LessonPlan[] = loadPlans();

/**
 * 检索相似案例
 * Phase 1: 基于字段匹配的简单检索
 */
export function retrieveSimilarCases(params: {
  ageGroup?: string;
  duration?: number;
  category?: string;
  techType?: string;
  keyword?: string;
  limit?: number;
}): LessonPlan[] {
  const { ageGroup, duration, category, techType, keyword, limit = 5 } = params;

  let results = allPlans;

  // 按年龄组筛选
  if (ageGroup) {
    results = results.filter(p => p.age_group === ageGroup);
  }

  // 按分类筛选
  if (category) {
    results = results.filter(p => p.category === category);
  }

  // 按技术类型筛选
  if (techType) {
    results = results.filter(p =>
      p.tech_type.toLowerCase().includes(techType.toLowerCase())
    );
  }

  // 按时长筛选 (误差2分钟)
  if (duration) {
    results = results.filter(p =>
      Math.abs(p.duration - duration) <= 2
    );
  }

  // 按关键词搜索 (content, method, coach_guide)
  if (keyword) {
    const kw = keyword.toLowerCase();
    results = results.filter(p =>
      p.content.toLowerCase().includes(kw) ||
      p.method.toLowerCase().includes(kw) ||
      p.tech_type.toLowerCase().includes(kw) ||
      p.game_name.toLowerCase().includes(kw)
    );
  }

  // 返回结果，限制数量
  return results.slice(0, limit);
}

/**
 * 获取特定年龄组的随机案例
 */
export function getRandomCases(ageGroup: string, count: number = 3): LessonPlan[] {
  const filtered = allPlans.filter(p => p.age_group === ageGroup);
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * 获取特定分类的案例
 */
export function getCasesByCategory(
  category: string,
  ageGroup?: string,
  limit: number = 5
): LessonPlan[] {
  let results = allPlans.filter(p => p.category === category);

  if (ageGroup) {
    results = results.filter(p => p.age_group === ageGroup);
  }

  return results.slice(0, limit);
}

/**
 * 统计信息
 */
export function getStats() {
  return {
    total: allPlans.length,
    byAgeGroup: {
      U6: allPlans.filter(p => p.age_group === 'U6').length,
      U8: allPlans.filter(p => p.age_group === 'U8').length,
      U10: allPlans.filter(p => p.age_group === 'U10').length,
      U12: allPlans.filter(p => p.age_group === 'U12').length,
      U14: allPlans.filter(p => p.age_group === 'U14').length,
    },
    byCategory: {
      warmup: allPlans.filter(p => p.category === 'warmup').length,
      etiquette: allPlans.filter(p => p.category === 'etiquette').length,
      technical: allPlans.filter(p => p.category === 'technical').length,
      physical: allPlans.filter(p => p.category === 'physical').length,
      tactical: allPlans.filter(p => p.category === 'tactical').length,
      game: allPlans.filter(p => p.category === 'game').length,
      cooldown: allPlans.filter(p => p.category === 'cooldown').length,
      other: allPlans.filter(p => p.category === 'other').length,
    }
  };
}

export { allPlans };
