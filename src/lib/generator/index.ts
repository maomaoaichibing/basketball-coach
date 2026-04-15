// ============================================// 篮球训练教案生成引擎 - 主入口// ============================================
import type {
  TrainingPlanOutput,
  AgeGroup,
  Location,
  PlanSection,
  SectionActivity,
  TrainingActivity,
  AgeGroupConfig,
  ThemeConfig,
  Intensity,
} from './types';

// 导出类型
export type {
  TrainingPlanOutput,
  AgeGroup,
  Location,
  PlanSection,
  SectionActivity,
  TrainingActivity,
  AgeGroupConfig,
  ThemeConfig,
  Intensity,
};
import { AGE_GROUP_CONFIG, THEME_CONFIG } from './config';
import { ActivityCacheManager } from './cache';
import { selectActivities, generateNotes, getThemeNames } from './utils';

// 教案生成函数
export function generateTrainingPlan(params: {
  group: AgeGroup;
  duration: number;
  location: Location;
  weather?: string;
  theme?: string;
  focusSkills?: string[];
}): TrainingPlanOutput {
  const { group, location, weather, theme, focusSkills = [] } = params;

  const config = AGE_GROUP_CONFIG[group];

  // 确定主题
  const selectedTheme = theme || Object.keys(THEME_CONFIG)[Math.floor(Math.random() * 4)];
  const themeConfig =
    THEME_CONFIG[selectedTheme as keyof typeof THEME_CONFIG] || THEME_CONFIG['综合训练'];

  // 根据主题调整时间分配
  const sections = generateSections(group, config, themeConfig, focusSkills);

  // 计算总时长
  const actualDuration = sections.reduce((sum, s) => sum + s.duration, 0);

  // 生成标题
  const themeNames = getThemeNames();
  const title = `${config.name} - ${themeNames[selectedTheme] || selectedTheme}`;

  // 生成备注
  const notes = generateNotes(group, location, weather);

  // 合并所有技能作为重点
  const allFocusSkills = Array.from(new Set([...themeConfig.skills, ...focusSkills]));

  return {
    title,
    date: new Date().toISOString().split('T')[0],
    duration: actualDuration,
    group,
    location,
    weather,
    theme: selectedTheme,
    focusSkills: allFocusSkills,
    intensity: themeConfig.intensity,
    sections,
    notes,
  };
}

// 生成教案 sections
function generateSections(
  group: AgeGroup,
  config: (typeof AGE_GROUP_CONFIG)[keyof typeof AGE_GROUP_CONFIG],
  themeConfig: (typeof THEME_CONFIG)[keyof typeof THEME_CONFIG],
  focusSkills: string[]
) {
  const sections = [];

  // 1. 课前礼仪
  if (config.hasEtiquette) {
    sections.push({
      name: '课前礼仪',
      category: 'etiquette' as const,
      duration: config.etiquetteDuration,
      activities: selectActivities(
        ActivityCacheManager.getActivities('etiquette'),
        1,
        config.etiquetteDuration,
        ['课前礼仪']
      ),
      points: ['师生相互问好', '整理队形'],
    });
  }

  // 2. 热身
  sections.push({
    name: '热身部分',
    category: 'warmup' as const,
    duration: config.warmupDuration,
    activities: selectActivities(
      ActivityCacheManager.getActivities('warmup'),
      config.maxDifficulty,
      config.warmupDuration,
      themeConfig.categories
    ),
    points: ['注意活动开', '避免受伤'],
  });

  // 3. 球性熟悉（U6/U8为主）
  if (config.ballFamDuration > 0) {
    sections.push({
      name: '球性熟悉',
      category: 'ball_familiarity' as const,
      duration: config.ballFamDuration,
      activities: selectActivities(
        ActivityCacheManager.getActivities('ball_familiarity'),
        Math.min(config.maxDifficulty, 2),
        config.ballFamDuration,
        themeConfig.categories
      ),
      points: ['左右手均衡', '球感培养'],
    });
  }

  // 4. 技术训练
  if (config.technicalDuration > 0) {
    sections.push({
      name: '技术训练',
      category: 'technical' as const,
      duration: config.technicalDuration,
      activities: selectActivities(
        ActivityCacheManager.getActivities('technical'),
        config.maxDifficulty,
        config.technicalDuration,
        [...themeConfig.categories, ...focusSkills]
      ),
      points: ['注意动作规范性', '循序渐进'],
    });
  }

  // 5. 体能训练（U10以上）
  if (config.physicalDuration > 0 && group !== 'U6') {
    sections.push({
      name: '体能素质',
      category: 'physical' as const,
      duration: config.physicalDuration,
      activities: selectActivities(
        ActivityCacheManager.getActivities('physical'),
        config.maxDifficulty,
        config.physicalDuration,
        themeConfig.categories
      ),
      points: ['注意安全', '量力而行'],
    });
  }

  // 6. 战术训练（U8以上）
  if (config.tacticalDuration > 0 && group !== 'U6' && group !== 'U8') {
    sections.push({
      name: '战术训练',
      category: 'tactical' as const,
      duration: config.tacticalDuration,
      activities: selectActivities(
        ActivityCacheManager.getActivities('tactical'),
        config.maxDifficulty,
        config.tacticalDuration,
        themeConfig.categories
      ),
      points: ['注意配合', '多沟通'],
    });
  }

  // 7. 对抗比赛
  if (config.gameDuration > 0) {
    sections.push({
      name: '对抗比赛',
      category: 'game' as const,
      duration: config.gameDuration,
      activities: selectActivities(
        ActivityCacheManager.getActivities('game'),
        config.maxDifficulty,
        config.gameDuration,
        themeConfig.categories
      ),
      points: ['积极防守', '团队配合'],
    });
  }

  // 8. 放松总结
  sections.push({
    name: '放松总结',
    category: 'cooldown' as const,
    duration: config.cooldownDuration,
    activities: selectActivities(
      ActivityCacheManager.getActivities('cooldown'),
      1,
      config.cooldownDuration,
      ['cooldown']
    ),
    points: ['静态拉伸', '总结本课', '布置作业'],
  });

  // 9. 课后礼仪
  if (config.hasEtiquette) {
    sections.push({
      name: '课后礼仪',
      category: 'etiquette' as const,
      duration: config.etiquetteDuration,
      activities: selectActivities(
        ActivityCacheManager.getActivities('etiquette'),
        1,
        config.etiquetteDuration,
        ['课后礼仪']
      ),
      points: ['感谢教练', '礼貌告别'],
    });
  }

  return sections;
}

// 辅助函数
export function getAgeGroupInfo(group: AgeGroup) {
  return AGE_GROUP_CONFIG[group];
}

export function getThemeList(): string[] {
  return Object.keys(THEME_CONFIG);
}

export function getActivityCategories(): string[] {
  return [
    'warmup',
    'ball_familiarity',
    'technical',
    'physical',
    'tactical',
    'game',
    'cooldown',
    'etiquette',
  ];
}

export function getSectionName(category: string): string {
  const names: Record<string, string> = {
    warmup: '热身部分',
    ball_familiarity: '球性熟悉',
    technical: '技术训练',
    physical: '体能素质',
    tactical: '战术训练',
    game: '对抗比赛',
    cooldown: '放松总结',
    etiquette: '礼仪',
  };
  return names[category] || category;
}
