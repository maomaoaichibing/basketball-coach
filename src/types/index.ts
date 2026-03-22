// ============================================
// 共享类型定义
// 解决 any 类型技术债务
// ============================================

// 训练记录
export interface TrainingRecord {
  id: string
  playerId: string
  playerName: string
  type: string
  content: string
  rating?: number
  feedback?: string
  attendance?: string
  createdAt: string
}

// 评估记录
export interface PlayerAssessment {
  id: string
  playerId: string
  playerName: string
  assessedAt: string
  dribbling: number
  passing: number
  shooting: number
  defending: number
  physical: number
  tactical: number
  overallRating?: number
  notes?: string
  assessorId?: string
  assessorName?: string
  createdAt: string
}

// 阶段目标
export interface PlayerGoal {
  id: string
  playerId: string
  skillType: string
  targetScore: number
  currentScore: number
  status: string
  targetDate?: string
  achievedAt?: string
  createdAt: string
}

// 课程报名
export interface CourseEnrollment {
  id: string
  playerId: string
  courseId: string
  courseName: string
  startDate: string
  endDate: string
  status: string
  remainingHours: number
  totalHours: number
  createdAt: string
}

// 请假记录
export interface Leave {
  id: string
  playerId: string
  playerName: string
  leaveType: string
  startDate: string
  endDate: string
  reason?: string
  status: string
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
}

// 打卡记录
export interface CheckIn {
  id: string
  playerId: string
  playerName: string
  type: string
  content?: string
  rating?: number
  coachFeedback?: string
  createdAt: string
}

// 消息
export interface Message {
  id: string
  senderId: string
  senderName: string
  senderType: string
  receiverId: string
  receiverName: string
  receiverType: string
  content: string
  isRead: boolean
  createdAt: string
}

// 能力维度
export interface AbilityDimensions {
  dribbling: number
  passing: number
  shooting: number
  defending: number
  physical: number
  tactical: number
}

// 进步追踪
export interface ProgressData {
  dribbling: string
  passing: string
  shooting: string
  defending: string
  physical: string
  tactical: string
}

// 能力分析
export interface AbilityAnalysis {
  id: string
  playerId: string
  playerName: string
  overallScore: number
  dimensions: string
  progress: string
  strengths: string
  weaknesses: string
  createdAt: string
}

// 训练统计
export interface TrainingStats {
  totalTrainings: number
  attendance: number
  avgRating: number
  recentTrends: string
}

// 比赛统计
export interface MatchStats {
  totalMatches: number
  wins: number
  losses: number
  draws: number
  avgScore: string
}

// 家长端完整数据
export interface ParentPlayerData {
  id: string
  name: string
  group: string
  school?: string
  team?: { name: string; coachName: string }
  guardians: { name: string; relation: string }[]
  abilities: AbilityDimensions
  records: TrainingRecord[]
  latestAssessment?: PlayerAssessment
  activeGoals: PlayerGoal[]
  enrollments: CourseEnrollment[]
}

// 班主任查询参数
export interface ParentQueryParams {
  phone: string
}

// API通用响应
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  total?: number
}

// 分页参数
export interface PaginationParams {
  page?: number
  limit?: number
}

// 排序参数
export interface SortParams {
  sortBy?: string
  order?: 'asc' | 'desc'
}

// 筛选参数
export interface FilterParams {
  group?: string
  campusId?: string
  status?: string
  type?: string
  playerId?: string
  startDate?: string
  endDate?: string
}

// 组合查询参数
export interface QueryParams extends PaginationParams, SortParams, FilterParams {}

// 能力雷达图数据
export interface RadarChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string
    borderColor?: string
  }[]
}

// 成长报告数据
export interface GrowthReportData {
  playerInfo: {
    id: string
    name: string
    group: string
  }
  period: {
    start: string
    end: string
    type: string
  }
  abilities: AbilityDimensions
  progress: ProgressData
  strengths: string[]
  weaknesses: string[]
  trainingStats: TrainingStats
  matchStats: MatchStats
  nextGoals: PlayerGoal[]
  coachComments?: string
}

// 教案活动
export interface PlanActivity {
  id?: string
  name: string
  duration: number
  content: string
  equipment?: string
  notes?: string
}

// 教案环节
export interface PlanSection {
  id?: string
  name: string
  duration: number
  activities: PlanActivity[]
  notes?: string
}

// 教案完整数据
export interface TrainingPlan {
  id: string
  title: string
  group: string
  duration: number
  location: string
  theme: string
  focusSkills: string[]
  difficulty: string
  objectives: string[]
  warmup: PlanSection
  main: PlanSection
  cooldown: PlanSection
  safetyNotes?: string
  createdAt: string
}

// 比赛数据
export interface Match {
  id: string
  name: string
  type: string
  date: string
  location?: string
  ourScore?: number
  opponentScore?: number
  opponent?: string
  quarterScores?: { quarter: string; ourScore: number; opponentScore: number }[]
  status: string
  createdAt: string
}

// 比赛球员统计
export interface MatchPlayerStat {
  playerId: string
  playerName: string
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  fouls: number
  minutes?: number
}
