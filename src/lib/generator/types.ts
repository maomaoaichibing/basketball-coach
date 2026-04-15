// ============================================// 篮球训练教案生成引擎 - 类型定义// ============================================
export type AgeGroup = 'U6' | 'U8' | 'U10' | 'U12' | 'U14';
export type Intensity = 'low' | 'medium' | 'high';
export type Location = '室内' | '室外';

// 训练活动
export interface TrainingActivity {
  id: string;
  name: string;
  description: string; // 详细训练步骤，格式：【队形】+【学员位置】+【具体动作】
  duration: number; // 分钟
  category:
    | 'warmup'
    | 'ball_familiarity'
    | 'technical'
    | 'physical'
    | 'tactical'
    | 'game'
    | 'cooldown'
    | 'etiquette';
  skills: string[];
  difficulty: number; // 1-5
  equipment: string[];
  keyPoints?: string[];
  form?: string; // 建议形式：集体/排面/分组等
  coachGuide?: string; // 教练引导语
  sets?: string; // 组数（如：2-3组）
  repetitions?: string; // 次数/时间（如：每组8-10次）
  progression?: string; // 递进式说明（从易到难）
  drillDiagram?: string; // 动作路线示意图（SVG格式）
}

// 教案输出
export interface TrainingPlanOutput {
  title: string;
  date: string;
  duration: number;
  group: AgeGroup;
  location: Location;
  weather?: string;
  theme: string;
  focusSkills: string[];
  intensity: Intensity;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  sections: PlanSection[];
  notes: string;
  trainingProgression?: string; // 整体递进关系说明
}

export interface PlanSection {
  name: string;
  category:
    | 'warmup'
    | 'ball_familiarity'
    | 'technical'
    | 'physical'
    | 'tactical'
    | 'game'
    | 'cooldown'
    | 'etiquette';
  duration: number;
  activities: SectionActivity[];
  points?: string[];
}

export interface SectionActivity {
  name: string;
  duration: number;
  description: string; // 详细训练步骤
  keyPoints: string[];
  equipment?: string[];
  form?: string;
  coachGuide?: string; // 教练引导语
  sets?: string; // 组数（如：2-3组）
  repetitions?: string; // 次数/时间（如：每组8-10次）
  progression?: string; // 递进式说明（从易到难）
  drillDiagram?: string; // 动作路线示意图（SVG格式）
  relatedTo?: string; // 关联提示（如：为后面的XX训练做准备）
}

// 年龄段配置类型
export interface AgeGroupConfig {
  name: string;
  minAge: number;
  maxAge: number;
  sections: string[];
  warmupDuration: number;
  ballFamDuration: number;
  technicalDuration: number;
  physicalDuration: number;
  tacticalDuration: number;
  gameDuration: number;
  cooldownDuration: number;
  etiquetteDuration: number;
  maxDifficulty: number;
  recommendedSkills: string[];
  avoidActivities: string[];
  hasEtiquette: boolean;
}

// 主题配置类型
export interface ThemeConfig {
  skills: string[];
  categories: string[];
  intensity: Intensity;
}
