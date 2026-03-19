// ============================================
// 篮球训练教案生成引擎 - 基于真实教案优化版
// ============================================

export type AgeGroup = 'U6' | 'U8' | 'U10' | 'U12' | 'U14'
export type Intensity = 'low' | 'medium' | 'high'
export type Location = '室内' | '室外'

// 训练活动
export interface TrainingActivity {
  id: string
  name: string
  description: string
  duration: number // 分钟
  category: 'warmup' | 'ball_familiarity' | 'technical' | 'physical' | 'tactical' | 'game' | 'cooldown' | 'etiquette'
  skills: string[]
  difficulty: number // 1-5
  equipment: string[]
  keyPoints?: string[]
  form?: string // 建议形式：集体/排面/分组等
}

// 教案输出
export interface TrainingPlanOutput {
  title: string
  date: string
  duration: number
  group: AgeGroup
  location: Location
  weather?: string
  theme: string
  focusSkills: string[]
  intensity: Intensity
  sections: PlanSection[]
  notes: string
}

export interface PlanSection {
  name: string
  category: 'warmup' | 'ball_familiarity' | 'technical' | 'physical' | 'tactical' | 'game' | 'cooldown' | 'etiquette'
  duration: number
  activities: SectionActivity[]
  points?: string[]
}

export interface SectionActivity {
  name: string
  duration: number
  description: string
  keyPoints: string[]
  equipment?: string[]
  form?: string
}

// ============================================
// 训练模块库 - 基于真实教案
// ============================================

// 课前准备/热身活动
const WARMUP_ACTIVITIES: Omit<TrainingActivity, 'id'>[] = [
  { name: '集合站队', description: '快速集合整队', duration: 2, category: 'warmup', skills: [], difficulty: 1, equipment: [], form: '集体' },
  { name: '慢跑热身', description: '绕场慢跑，保持队形', duration: 5, category: 'warmup', skills: ['physical'], difficulty: 1, equipment: [], form: '集体' },
  { name: '动态拉伸', description: '腿部摆动、踢臀跑、侧向滑步', duration: 8, category: 'warmup', skills: ['physical'], difficulty: 1, equipment: [], form: '集体' },
  { name: '关节活动', description: '手腕、脚踝、膝关节活动', duration: 5, category: 'warmup', skills: ['physical'], difficulty: 1, equipment: [], form: '集体' },
  { name: '敏捷梯训练', description: '快速脚步练习', duration: 6, category: 'warmup', skills: ['physical'], difficulty: 2, equipment: ['敏捷梯'], form: '依次' },
]

// 球性熟悉（幼儿班特色）
const BALL_FAMILIARITY_ACTIVITIES: Omit<TrainingActivity, 'id'>[] = [
  { name: '原地拍球', description: '双手交替拍球', duration: 5, category: 'ball_familiarity', skills: ['dribbling'], difficulty: 1, equipment: ['球'], form: '集体' },
  { name: '左右手交替', description: '左右手交替拍球', duration: 5, category: 'ball_familiarity', skills: ['dribbling'], difficulty: 1, equipment: ['球'], form: '集体' },
  { name: '体前变向', description: '体前左右手变向运球', duration: 5, category: 'ball_familiarity', skills: ['dribbling'], difficulty: 1, equipment: ['球'], form: '集体' },
  { name: '原地抛接球', description: '双手抛接球、单手接球', duration: 5, category: 'ball_familiarity', skills: ['passing'], difficulty: 1, equipment: ['球'], form: '集体' },
  { name: '腰部绕球', description: '球绕腰部', duration: 5, category: 'ball_familiarity', skills: ['dribbling'], difficulty: 1, equipment: ['球'], form: '集体' },
  { name: '腿部绕球', description: '球绕腿部', duration: 5, category: 'ball_familiarity', skills: ['dribbling'], difficulty: 1, equipment: ['球'], form: '集体' },
  { name: '原地高运球', description: '大力拍球', duration: 4, category: 'ball_familiarity', skills: ['dribbling'], difficulty: 1, equipment: ['球'], form: '集体' },
  { name: '原地低运球', description: '低运球', duration: 4, category: 'ball_familiarity', skills: ['dribbling'], difficulty: 1, equipment: ['球'], form: '集体' },
]

// 技术训练
const TECHNICAL_ACTIVITIES: Omit<TrainingActivity, 'id'>[] = [
  // 运球
  { name: '原地运球', description: '高低运球、运球节奏', duration: 8, category: 'technical', skills: ['dribbling'], difficulty: 1, equipment: ['球'], keyPoints: ['手指触球', '掌心空出', '低头看球'], form: '集体' },
  { name: '行进间运球', description: '直线运球、变向运球', duration: 10, category: 'technical', skills: ['dribbling'], difficulty: 2, equipment: ['球'], form: '依次' },
  { name: '跨下运球', description: '双手跨下运球', duration: 8, category: 'technical', skills: ['dribbling'], difficulty: 2, equipment: ['球'], form: '依次' },
  { name: '背后运球', description: '背后运球基本动作', duration: 8, category: 'technical', skills: ['dribbling'], difficulty: 2, equipment: ['球'], form: '依次' },
  { name: '体前变向', description: '体前换手变向运球', duration: 6, category: 'technical', skills: ['dribbling'], difficulty: 2, equipment: ['球'], keyPoints: ['压球', '加速'], form: '依次' },
  { name: '转身运球', description: '后转身、前转身运球', duration: 8, category: 'technical', skills: ['dribbling'], difficulty: 3, equipment: ['球'], keyPoints: ['先转头', '压肩'], form: '依次' },
  { name: '行进间障碍换手运球', description: '绕过障碍物换手运球', duration: 8, category: 'technical', skills: ['dribbling'], difficulty: 2, equipment: ['标志桶'], form: '依次' },
  { name: '小折线背后运球', description: '小折线障碍背后运球', duration: 8, category: 'technical', skills: ['dribbling'], difficulty: 2, equipment: ['标志桶'], keyPoints: ['急停', '转身压肩'], form: '依次' },
  { name: '小折线胯下运球', description: '小折线障碍胯下变向', duration: 8, category: 'technical', skills: ['dribbling'], difficulty: 2, equipment: ['标志桶'], keyPoints: ['送球转胯'], form: '依次' },
  { name: '交叉步突破', description: '交叉步突破技术', duration: 8, category: 'technical', skills: ['dribbling'], difficulty: 2, equipment: ['球'], keyPoints: ['蹬地', '加速'], form: '依次' },
  
  // 传球
  { name: '胸前传球', description: '双人传球练习', duration: 8, category: 'technical', skills: ['passing'], difficulty: 1, equipment: ['球'], keyPoints: ['手指拨球', '出手'], form: '双人' },
  { name: '地板传球', description: '低手传球准确性', duration: 6, category: 'technical', skills: ['passing'], difficulty: 2, equipment: ['球'], form: '双人' },
  { name: '单手肩上传球', description: '长传技术', duration: 6, category: 'technical', skills: ['passing'], difficulty: 2, equipment: ['球'], form: '双人' },
  { name: '反弹传球', description: '击地传球', duration: 8, category: 'technical', skills: ['passing'], difficulty: 2, equipment: ['球'], form: '双人' },
  { name: '三次胸前平传球结合上篮', description: '传球后接球上篮', duration: 10, category: 'technical', skills: ['passing', 'shooting'], difficulty: 3, equipment: ['球', '篮筐'], keyPoints: ['传球标准', '不要走步'], form: '依次' },
  
  // 投篮
  { name: '原地投篮', description: '正确手型练习', duration: 10, category: 'technical', skills: ['shooting'], difficulty: 1, equipment: ['球', '篮筐'], keyPoints: ['手型', '压腕'], form: '依次' },
  { name: '行进间投篮', description: '跑动中接球投篮', duration: 10, category: 'technical', skills: ['shooting'], difficulty: 2, equipment: ['球', '篮筐'], form: '依次' },
  { name: '罚球线投篮', description: '稳定性投篮', duration: 8, category: 'technical', skills: ['shooting'], difficulty: 2, equipment: ['球', '篮筐'], form: '依次' },
  { name: '左右手打板投篮', description: '左右手打板投篮', duration: 8, category: 'technical', skills: ['shooting'], difficulty: 2, equipment: ['球', '篮筐'], form: '依次' },
  { name: '三威胁投篮', description: '三威胁姿势接投篮', duration: 8, category: 'technical', skills: ['shooting', 'tactical'], difficulty: 2, equipment: ['球'], form: '依次' },
  
  // 防守
  { name: '防守姿势', description: '滑步、防守站位', duration: 8, category: 'technical', skills: ['defending'], difficulty: 1, equipment: [], keyPoints: ['屈膝', '重心低'], form: '集体' },
  { name: '滑步练习', description: '前后左右滑步', duration: 6, category: 'technical', skills: ['defending'], difficulty: 1, equipment: [], form: '集体' },
  { name: '抢球练习', description: '一对一抢球', duration: 6, category: 'technical', skills: ['defending'], difficulty: 2, equipment: ['球'], form: '分组' },
  { name: '防突破', description: '防突破练习', duration: 8, category: 'technical', skills: ['defending'], difficulty: 2, equipment: ['球'], keyPoints: ['重心', '伸手'], form: '分组' },
  
  // 三威胁
  { name: '三威胁脚步训练', description: '三威胁姿势脚步', duration: 6, category: 'technical', skills: ['tactical'], difficulty: 2, equipment: ['球'], form: '依次' },
  { name: '三威胁突破', description: '三威胁突破启动', duration: 6, category: 'technical', skills: ['tactical', 'dribbling'], difficulty: 2, equipment: ['球'], form: '依次' },
  
  // 上篮
  { name: '基础上篮脚步', description: '基本三步上篮', duration: 8, category: 'technical', skills: ['shooting'], difficulty: 2, equipment: ['球', '篮筐'], keyPoints: ['右左跳', '打板'], form: '依次' },
  { name: '左右手上篮', description: '左右手上篮', duration: 8, category: 'technical', skills: ['shooting'], difficulty: 3, equipment: ['球', '篮筐'], form: '依次' },
]

// 体能训练
const PHYSICAL_ACTIVITIES: Omit<TrainingActivity, 'id'>[] = [
  { name: '跳绳', description: '跳绳练习（中考体育）', duration: 10, category: 'physical', skills: ['physical'], difficulty: 1, equipment: ['跳绳'], keyPoints: ['姿态', '摇绳'], form: '集体' },
  { name: '敏捷梯', description: '敏捷梯脚步练习', duration: 8, category: 'physical', skills: ['physical'], difficulty: 2, equipment: ['敏捷梯'], form: '依次' },
  { name: '折返跑', description: '篮球场折返跑', duration: 8, category: 'physical', skills: ['physical'], difficulty: 2, equipment: [], form: '依次' },
  { name: '鸭子步', description: '鸭子步练习', duration: 5, category: 'physical', skills: ['physical'], difficulty: 2, equipment: [], form: '集体' },
  { name: '蛙跳', description: '蛙跳练习', duration: 5, category: 'physical', skills: ['physical'], difficulty: 2, equipment: [], form: '集体' },
  { name: '仰卧起坐', description: '仰卧起坐练习', duration: 8, category: 'physical', skills: ['physical'], difficulty: 1, equipment: ['垫子'], form: '集体' },
  { name: '折返运球', description: '折返运球比赛', duration: 8, category: 'physical', skills: ['physical', 'dribbling'], difficulty: 2, equipment: ['球'], form: '分组' },
]

// 战术训练
const TACTICAL_ACTIVITIES: Omit<TrainingActivity, 'id'>[] = [
  { name: '二打一练习', description: '进攻配合', duration: 10, category: 'tactical', skills: ['tactical', 'passing'], difficulty: 2, equipment: ['球', '篮筐'], form: '分组' },
  { name: '三打二练习', description: '进攻与防守转换', duration: 12, category: 'tactical', skills: ['tactical'], difficulty: 3, equipment: ['球', '篮筐'], form: '分组' },
  { name: '挡拆配合', description: '基础挡拆战术', duration: 10, category: 'tactical', skills: ['tactical'], difficulty: 3, equipment: ['球'], form: '分组' },
  { name: '轮转防守', description: '团队防守轮转', duration: 10, category: 'tactical', skills: ['tactical', 'defending'], difficulty: 3, equipment: [], form: '集体' },
  { name: '快攻练习', description: '二三快攻', duration: 10, category: 'tactical', skills: ['tactical', 'physical'], difficulty: 3, equipment: ['球', '篮筐'], form: '分组' },
  { name: '半场比赛', description: '3v3半场比赛', duration: 15, category: 'tactical', skills: ['tactical'], difficulty: 3, equipment: ['球', '篮筐'], form: '分组' },
  { name: '全场对抗', description: '5v5全场比赛', duration: 15, category: 'tactical', skills: ['tactical'], difficulty: 4, equipment: ['球', '篮筐'], form: '分组' },
]

// 对抗比赛
const GAME_ACTIVITIES: Omit<TrainingActivity, 'id'>[] = [
  { name: '三对三对抗', description: '3v3全场比赛', duration: 15, category: 'game', skills: [], difficulty: 3, equipment: ['球', '篮筐'], form: '分组' },
  { name: '四对四对抗', description: '4v4半场比赛', duration: 15, category: 'game', skills: [], difficulty: 3, equipment: ['球', '篮筐'], form: '分组' },
  { name: '五对五对抗', description: '5v5全场比赛', duration: 20, category: 'game', skills: [], difficulty: 4, equipment: ['球', '篮筐'], form: '分组' },
  { name: '投篮比赛', description: '分组投篮竞赛', duration: 10, category: 'game', skills: ['shooting'], difficulty: 2, equipment: ['球', '篮筐'], form: '分组' },
  { name: '运球接力', description: '团队运球比赛', duration: 8, category: 'game', skills: ['dribbling'], difficulty: 1, equipment: ['球'], form: '分组' },
  { name: '传球抢分', description: '限时传球抢分', duration: 8, category: 'game', skills: ['passing'], difficulty: 2, equipment: ['球'], form: '分组' },
]

// 放松/课后
const COOLDOWN_ACTIVITIES: Omit<TrainingActivity, 'id'>[] = [
  { name: '静态拉伸', description: '全身放松拉伸', duration: 8, category: 'cooldown', skills: [], difficulty: 1, equipment: [], keyPoints: ['拉伸到位'], form: '集体' },
  { name: '大腿前侧拉伸', description: '大腿前侧肌群拉伸', duration: 3, category: 'cooldown', skills: [], difficulty: 1, equipment: [], form: '集体' },
  { name: '大腿内侧拉伸', description: '大腿内侧拉伸', duration: 3, category: 'cooldown', skills: [], difficulty: 1, equipment: [], form: '集体' },
  { name: '手臂后侧拉伸', description: '手臂后侧拉伸', duration: 3, category: 'cooldown', skills: [], difficulty: 1, equipment: [], form: '集体' },
  { name: '总结回顾', description: '本节课总结', duration: 5, category: 'cooldown', skills: [], difficulty: 1, equipment: [], keyPoints: ['强调重点', '布置作业'], form: '集体' },
  { name: '呼吸调整', description: '深呼吸放松', duration: 3, category: 'cooldown', skills: [], difficulty: 1, equipment: [], form: '集体' },
]

// 礼仪
const ETIQUETTE_ACTIVITIES: Omit<TrainingActivity, 'id'>[] = [
  { name: '课前礼仪', description: '师生相互鞠躬问好', duration: 2, category: 'etiquette', skills: [], difficulty: 1, equipment: [], form: '集体', keyPoints: ['鞠躬', '问好'] },
  { name: '课后礼仪', description: '师生相互鞠躬说辛苦', duration: 2, category: 'etiquette', skills: [], difficulty: 1, equipment: [], form: '集体', keyPoints: ['感谢', '礼貌'] },
  { name: '颁发证书', description: '颁发训练证书', duration: 3, category: 'etiquette', skills: [], difficulty: 1, equipment: ['证书'], form: '集体', keyPoints: ['鼓励', '表扬'] },
]

// 年龄段配置
const AGE_GROUP_CONFIG: Record<AgeGroup, {
  name: string
  minAge: number
  maxAge: number
  sections: string[]
  warmupDuration: number
  ballFamDuration: number
  technicalDuration: number
  physicalDuration: number
  tacticalDuration: number
  gameDuration: number
  cooldownDuration: number
  etiquetteDuration: number
  maxDifficulty: number
  recommendedSkills: string[]
  avoidActivities: string[]
  hasEtiquette: boolean
}> = {
  U6: {
    name: 'U6 (4-6岁 幼儿班)',
    minAge: 4,
    maxAge: 6,
    sections: ['etiquette', 'warmup', 'ball_familiarity', 'game', 'cooldown', 'etiquette'],
    warmupDuration: 8,
    ballFamDuration: 20,
    technicalDuration: 10,
    physicalDuration: 10,
    tacticalDuration: 0,
    gameDuration: 20,
    cooldownDuration: 8,
    etiquetteDuration: 4,
    maxDifficulty: 2,
    recommendedSkills: ['dribbling', 'shooting'],
    avoidActivities: ['对抗比赛', '复杂战术', '背后运球'],
    hasEtiquette: true
  },
  U8: {
    name: 'U8 (7-8岁 小学低年级)',
    minAge: 7,
    maxAge: 8,
    sections: ['etiquette', 'warmup', 'ball_familiarity', 'technical', 'game', 'cooldown', 'etiquette'],
    warmupDuration: 6,
    ballFamDuration: 12,
    technicalDuration: 25,
    physicalDuration: 10,
    tacticalDuration: 5,
    gameDuration: 20,
    cooldownDuration: 6,
    etiquetteDuration: 4,
    maxDifficulty: 2,
    recommendedSkills: ['dribbling', 'passing', 'shooting'],
    avoidActivities: ['复杂挡拆'],
    hasEtiquette: true
  },
  U10: {
    name: 'U10 (9-10岁 小学中年级)',
    minAge: 9,
    maxAge: 10,
    sections: ['etiquette', 'warmup', 'technical', 'physical', 'tactical', 'game', 'cooldown', 'etiquette'],
    warmupDuration: 6,
    ballFamDuration: 5,
    technicalDuration: 25,
    physicalDuration: 15,
    tacticalDuration: 15,
    gameDuration: 18,
    cooldownDuration: 6,
    etiquetteDuration: 4,
    maxDifficulty: 3,
    recommendedSkills: ['dribbling', 'passing', 'shooting', 'defending'],
    avoidActivities: [],
    hasEtiquette: true
  },
  U12: {
    name: 'U12 (11-12岁 小学高年级/初一)',
    minAge: 11,
    maxAge: 12,
    sections: ['etiquette', 'warmup', 'technical', 'physical', 'tactical', 'game', 'cooldown', 'etiquette'],
    warmupDuration: 6,
    ballFamDuration: 0,
    technicalDuration: 22,
    physicalDuration: 18,
    tacticalDuration: 18,
    gameDuration: 22,
    cooldownDuration: 6,
    etiquetteDuration: 4,
    maxDifficulty: 4,
    recommendedSkills: ['dribbling', 'passing', 'shooting', 'defending', 'tactical'],
    avoidActivities: [],
    hasEtiquette: true
  },
  U14: {
    name: 'U14 (13-14岁 初二/初三)',
    minAge: 13,
    maxAge: 14,
    sections: ['etiquette', 'warmup', 'technical', 'physical', 'tactical', 'game', 'cooldown', 'etiquette'],
    warmupDuration: 5,
    ballFamDuration: 0,
    technicalDuration: 20,
    physicalDuration: 20,
    tacticalDuration: 22,
    gameDuration: 25,
    cooldownDuration: 5,
    etiquetteDuration: 3,
    maxDifficulty: 5,
    recommendedSkills: ['dribbling', 'passing', 'shooting', 'defending', 'tactical', 'physical'],
    avoidActivities: [],
    hasEtiquette: true
  }
}

// 主题配置
const THEME_CONFIG = {
  '运球基础': { skills: ['dribbling'], categories: ['technical', 'ball_familiarity'], intensity: 'medium' },
  '传球技术': { skills: ['passing'], categories: ['technical'], intensity: 'medium' },
  '投篮训练': { skills: ['shooting'], categories: ['technical'], intensity: 'medium' },
  '防守入门': { skills: ['defending'], categories: ['technical'], intensity: 'medium' },
  '进攻战术': { skills: ['tactical'], categories: ['tactical'], intensity: 'high' },
  '防守战术': { skills: ['defending', 'tactical'], categories: ['tactical'], intensity: 'high' },
  '体能训练': { skills: ['physical'], categories: ['physical'], intensity: 'high' },
  '综合训练': { skills: ['dribbling', 'passing', 'shooting'], categories: ['technical', 'game'], intensity: 'medium' },
  '对抗比赛': { skills: [], categories: ['game'], intensity: 'high' },
  '考核评估': { skills: ['dribbling', 'passing', 'shooting'], categories: ['technical'], intensity: 'medium' },
  '球性熟悉': { skills: ['dribbling'], categories: ['ball_familiarity'], intensity: 'low' },
  '中考体育': { skills: ['physical'], categories: ['physical'], intensity: 'medium' }
}

// ============================================
// 教案生成函数
// ============================================

export function generateTrainingPlan(params: {
  group: AgeGroup
  duration: number
  location: Location
  weather?: string
  theme?: string
  focusSkills?: string[]
}): TrainingPlanOutput {
  const { group, duration, location, weather, theme, focusSkills = [] } = params
  
  const config = AGE_GROUP_CONFIG[group]
  
  // 确定主题
  const selectedTheme = theme || Object.keys(THEME_CONFIG)[Math.floor(Math.random() * 4)]
  const themeConfig = THEME_CONFIG[selectedTheme as keyof typeof THEME_CONFIG] || THEME_CONFIG['综合训练']
  
  // 根据主题调整时间分配
  let adjustedDuration = duration || 90
  const sections: PlanSection[] = []
  
  // 1. 课前礼仪
  if (config.hasEtiquette) {
    sections.push({
      name: '课前礼仪',
      category: 'etiquette',
      duration: config.etiquetteDuration,
      activities: selectActivities(ETIQUETTE_ACTIVITIES, 1, config.etiquetteDuration, ['课前礼仪']),
      points: ['师生相互问好', '整理队形']
    })
  }
  
  // 2. 热身
  sections.push({
    name: '热身部分',
    category: 'warmup',
    duration: config.warmupDuration,
    activities: selectActivities(WARMUP_ACTIVITIES, config.maxDifficulty, config.warmupDuration, themeConfig.categories),
    points: ['注意活动开', '避免受伤']
  })
  
  // 3. 球性熟悉（U6/U8为主）
  if (config.ballFamDuration > 0) {
    sections.push({
      name: '球性熟悉',
      category: 'ball_familiarity',
      duration: config.ballFamDuration,
      activities: selectActivities(BALL_FAMILIARITY_ACTIVITIES, Math.min(config.maxDifficulty, 2), config.ballFamDuration, themeConfig.categories),
      points: ['左右手均衡', '球感培养']
    })
  }
  
  // 4. 技术训练
  if (config.technicalDuration > 0) {
    sections.push({
      name: '技术训练',
      category: 'technical',
      duration: config.technicalDuration,
      activities: selectActivities(TECHNICAL_ACTIVITIES, config.maxDifficulty, config.technicalDuration, [...themeConfig.categories, ...focusSkills]),
      points: ['注意动作规范性', '循序渐进']
    })
  }
  
  // 5. 体能训练（U10以上）
  if (config.physicalDuration > 0 && group !== 'U6') {
    sections.push({
      name: '体能素质',
      category: 'physical',
      duration: config.physicalDuration,
      activities: selectActivities(PHYSICAL_ACTIVITIES, config.maxDifficulty, config.physicalDuration, themeConfig.categories),
      points: ['注意安全', '量力而行']
    })
  }
  
  // 6. 战术训练（U8以上）
  if (config.tacticalDuration > 0 && group !== 'U6' && group !== 'U8') {
    sections.push({
      name: '战术训练',
      category: 'tactical',
      duration: config.tacticalDuration,
      activities: selectActivities(TACTICAL_ACTIVITIES, config.maxDifficulty, config.tacticalDuration, themeConfig.categories),
      points: ['注意配合', '多沟通']
    })
  }
  
  // 7. 对抗比赛
  if (config.gameDuration > 0) {
    sections.push({
      name: '对抗比赛',
      category: 'game',
      duration: config.gameDuration,
      activities: selectActivities(GAME_ACTIVITIES, config.maxDifficulty, config.gameDuration, themeConfig.categories),
      points: ['积极防守', '团队配合']
    })
  }
  
  // 8. 放松总结
  sections.push({
    name: '放松总结',
    category: 'cooldown',
    duration: config.cooldownDuration,
    activities: selectActivities(COOLDOWN_ACTIVITIES, 1, config.cooldownDuration, ['cooldown']),
    points: ['静态拉伸', '总结本课', '布置作业']
  })
  
  // 9. 课后礼仪
  if (config.hasEtiquette) {
    sections.push({
      name: '课后礼仪',
      category: 'etiquette',
      duration: config.etiquetteDuration,
      activities: selectActivities(ETIQUETTE_ACTIVITIES, 1, config.etiquetteDuration, ['课后礼仪']),
      points: ['感谢教练', '礼貌告别']
    })
  }
  
  // 计算总时长
  const actualDuration = sections.reduce((sum, s) => sum + s.duration, 0)
  
  // 生成标题
  const themeNames: Record<string, string> = {
    '运球基础': '运球进阶',
    '传球技术': '传球配合',
    '投篮训练': '投篮强化',
    '防守入门': '防守提升',
    '进攻战术': '进攻战术',
    '防守战术': '防守体系',
    '体能训练': '体能强化',
    '综合训练': '综合训练',
    '对抗比赛': '实战对抗',
    '考核评估': '技能考核',
    '球性熟悉': '球性培养',
    '中考体育': '体测训练'
  }
  
  const title = `${config.name} - ${themeNames[selectedTheme] || selectedTheme}`
  
  // 生成备注
  const notes = generateNotes(group, location, weather, sections)
  
  // 合并所有技能作为重点
  const allFocusSkills = Array.from(new Set([
    ...themeConfig.skills,
    ...focusSkills
  ]))
  
  return {
    title,
    date: new Date().toISOString().split('T')[0],
    duration: actualDuration,
    group,
    location,
    weather,
    theme: selectedTheme,
    focusSkills: allFocusSkills,
    intensity: themeConfig.intensity as Intensity,
    sections,
    notes
  }
}

// 选择合适的活动
function selectActivities(
  pool: Omit<TrainingActivity, 'id'>[],
  maxDifficulty: number,
  targetDuration: number,
  preferredCategories: string[]
): SectionActivity[] {
  const result: SectionActivity[] = []
  let usedTime = 0
  
  // 优先选择匹配类别的活动
  const preferred = pool.filter(a => 
    a.difficulty <= maxDifficulty && 
    (preferredCategories.includes(a.category) || preferredCategories.length === 0)
  )
  
  const others = pool.filter(a => 
    a.difficulty <= maxDifficulty && 
    !preferredCategories.includes(a.category)
  )
  
  const sorted = [...preferred, ...others]
  
  for (const activity of sorted) {
    if (usedTime + activity.duration > targetDuration + 3) continue
    if (result.length >= 4) break
    
    result.push({
      name: activity.name,
      duration: activity.duration,
      description: activity.description,
      keyPoints: activity.keyPoints || [],
      equipment: activity.equipment,
      form: activity.form
    })
    usedTime += activity.duration
  }
  
  // 如果时间不够，调整最后一个活动
  if (usedTime < targetDuration - 2 && result.length > 0) {
    const lastActivity = result[result.length - 1]
    lastActivity.duration = targetDuration - (usedTime - lastActivity.duration)
  }
  
  return result
}

// 生成备注
function generateNotes(group: AgeGroup, location: Location, weather: string | undefined, sections: PlanSection[]): string {
  const notes: string[] = []
  
  // 年龄段注意事项
  if (group === 'U6') {
    notes.push('幼儿班以游戏为主，注意时长控制')
    notes.push('多鼓励、少批评，保护孩子自信心')
    notes.push('每5-8分钟休息一次')
  } else if (group === 'U8') {
    notes.push('加强球性熟悉，注意手部力量训练')
    notes.push('培养基本功，循序渐进')
  } else if (group === 'U10') {
    notes.push('开始加入体能训练')
    notes.push('技术动作规范化')
  }
  
  // 场地天气
  if (location === '室外') {
    if (weather === '晴天') {
      notes.push('注意防晒，每15分钟补充水分')
      notes.push('避免长时间阳光直射')
    }
    if (weather === '阴天') {
      notes.push('注意保暖，活动后及时穿衣')
    }
    if (weather === '雨天') {
      notes.push('建议改室内，或减少对抗')
      notes.push('注意场地湿滑')
    }
  }
  
  // 安全提示
  notes.push('训练前检查场地，确保无安全隐患')
  notes.push('准备急救箱')
  notes.push('关注学员状态，及时调整强度')
  
  return notes.join('；')
}

// ============================================
// 辅助函数
// ============================================

export function getAgeGroupInfo(group: AgeGroup) {
  return AGE_GROUP_CONFIG[group]
}

export function getThemeList(): string[] {
  return Object.keys(THEME_CONFIG)
}

export function getActivityCategories(): string[] {
  return ['warmup', 'ball_familiarity', 'technical', 'physical', 'tactical', 'game', 'cooldown', 'etiquette']
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
    etiquette: '礼仪'
  }
  return names[category] || category
}
