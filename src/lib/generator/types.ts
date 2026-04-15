// ============================================// 篮球训练教案生成引擎 - 类型定义// ============================================
export type AgeGroup = 'U6' | 'U8' | 'U10' | 'U12' | 'U14';
export type Intensity = 'low' | 'medium' | 'high';
export type Location = '室内' | '室外';

export interface VideoResource {
  platform: 'bilibili' | 'youtube' | 'xigua' | 'custom';
  videoId: string;
  title?: string;
  thumbnailUrl?: string;
  duration?: number;
}

export interface DrillStep {
  step: number;
  instruction: string;
  coachingTip?: string;
}

export interface CommonMistake {
  mistake: string;
  correction: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface TrainingActivity {
  id: string;
  name: string;
  description: string;
  duration: number;
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
  difficulty: number;
  equipment: string[];
  keyPoints?: string[];
  form?: string;
  coachGuide?: string;
  sets?: string;
  repetitions?: string;
  progression?: string;
  drillDiagram?: string;
  drillSteps?: DrillStep[];
  commonMistakes?: CommonMistake[];
  videos?: VideoResource[];
  coachingDetails?: string;
  organizationTips?: string;
  safetyNotes?: string[];
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
  description: string;
  keyPoints: string[];
  equipment?: string[];
  form?: string;
  coachGuide?: string;
  sets?: string;
  repetitions?: string;
  progression?: string;
  drillDiagram?: string;
  relatedTo?: string;
  drillSteps?: DrillStep[];
  commonMistakes?: CommonMistake[];
  videos?: VideoResource[];
  coachingDetails?: string;
  organizationTips?: string;
  safetyNotes?: string[];
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
