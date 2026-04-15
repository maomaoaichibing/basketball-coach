'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/auth';
import {
  CalendarDays,
  ChevronRight,
  Clock,
  ClipboardList,
  AlertTriangle,
  Activity,
  CheckCircle2,
  XCircle,
  Timer,
  Users,
  Target,
  TrendingUp,
  Sparkles,
  MapPin,
  Play,
  Plus,
  Zap,
  BarChart3,
} from 'lucide-react';

// 类型定义
type DashboardData = {
  date: string;
  dayOfWeek: number;
  dayName: string;
  todaySchedules: TodaySchedule[];
  lowHourEnrollments: LowHourEnrollment[];
  recentPlans: RecentPlan[];
  recentRecords: RecentRecord[];
  stats: {
    totalPlayers: number;
    totalPlans: number;
    weekTrainingCount: number;
    attendanceRate: number | null;
    todayScheduleCount: number;
    lowHourCount: number;
    activeGoalCount: number;
  };
  activeGoals: ActiveGoal[];
};

type TodaySchedule = {
  id: string;
  title: string;
  group: string;
  startTime: string;
  endTime: string;
  duration: number;
  location: string;
  coachName: string;
  maxPlayers: number;
  planId: string | null;
  team: { id: string; name: string } | null;
  plan: { id: string; title: string; group: string; theme: string; duration: number } | null;
  planStats: { total: number; present: number; absent: number; late: number } | null;
};

type LowHourEnrollment = {
  id: string;
  playerId: string;
  totalHours: number;
  usedHours: number;
  remainingHours: number;
  expireDate: string;
  player: { id: string; name: string; group: string };
  course: { id: string; name: string; type: string };
};

type RecentPlan = {
  id: string;
  title: string;
  date: string;
  group: string;
  theme: string | null;
  duration: number;
  location: string;
  generatedBy: string | null;
  createdAt: string;
};

type RecentRecord = {
  id: string;
  playerId: string;
  playerName: string;
  playerGroup: string;
  planId: string;
  planTitle: string;
  attendance: string;
  performance: number | null;
  feedback: string | null;
  createdAt: string;
};

type ActiveGoal = {
  id: string;
  playerId: string;
  playerName: string;
  skillType: string;
  currentScore: number;
  targetScore: number;
  targetDate: string | null;
  progress: number;
};

const skillLabels: Record<string, string> = {
  dribbling: '运球',
  passing: '传球',
  shooting: '投篮',
  defending: '防守',
  physical: '体能',
  tactical: '战术',
};

export default function CoachDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/api/dashboard');
      const result = await response.json();
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('获取工作台数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">加载工作台...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">加载失败，请刷新重试</p>
        </div>
      </div>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了';
    if (hour < 12) return '早上好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部欢迎 */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{greeting()}，教练 👋</h1>
              <p className="text-orange-100 mt-1">
                {data.dayName} ·{' '}
                {new Date(data.date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                {data.stats.todayScheduleCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    今日 {data.stats.todayScheduleCount} 节课
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/plan/new"
                className="px-4 py-2 bg-white text-orange-600 hover:bg-orange-50 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                生成教案
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {data.stats.todayScheduleCount}
                </div>
                <div className="text-xs text-gray-500">今日课程</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{data.stats.totalPlayers}</div>
                <div className="text-xs text-gray-500">在册学员</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {data.stats.attendanceRate !== null ? `${data.stats.attendanceRate}%` : '-'}
                </div>
                <div className="text-xs text-gray-500">今日出勤</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{data.stats.activeGoalCount}</div>
                <div className="text-xs text-gray-500">进行中目标</div>
              </div>
            </div>
          </div>
        </div>

        {/* 主体两栏 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左栏：今日课程 + 快捷操作 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 今日课程 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  今日课程
                </h2>
                <Link
                  href="/schedule"
                  className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  全部排课 <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {!data.todaySchedules || data.todaySchedules.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400">
                  <CalendarDays className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p>今天没有排课</p>
                  <Link href="/schedule" className="text-orange-500 text-sm mt-1 inline-block">
                    去安排课程 →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.todaySchedules.map((schedule, index) => (
                    <div key={schedule.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* 时间轴 */}
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold text-orange-600">
                            {schedule.startTime}
                          </span>
                          <div className="w-0.5 h-6 bg-orange-200 my-1" />
                          <span className="text-xs text-gray-400">{schedule.endTime}</span>
                        </div>

                        {/* 课程信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 truncate">
                              {schedule.plan?.title || schedule.title}
                            </span>
                            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded shrink-0">
                              {schedule.group}
                            </span>
                            {schedule.plan && (
                              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded flex items-center gap-0.5 shrink-0">
                                <Sparkles className="w-2.5 h-2.5" /> 已关联教案
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {schedule.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Timer className="w-3 h-3" /> {schedule.duration}分钟
                            </span>
                            {schedule.team && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" /> {schedule.team.name}
                              </span>
                            )}
                          </div>
                          {schedule.planStats && schedule.planStats.total > 0 && (
                            <div className="flex items-center gap-2 mt-2 text-xs">
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="w-3 h-3" /> {schedule.planStats.present}到
                              </span>
                              <span className="flex items-center gap-1 text-yellow-600">
                                <Timer className="w-3 h-3" /> {schedule.planStats.late}迟
                              </span>
                              <span className="flex items-center gap-1 text-red-500">
                                <XCircle className="w-3 h-3" /> {schedule.planStats.absent}缺
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 操作 */}
                        <Link
                          href={
                            schedule.planId ? `/training?planId=${schedule.planId}` : '/training'
                          }
                          className="shrink-0 px-3 py-1.5 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 flex items-center gap-1 transition-colors"
                        >
                          <Play className="w-3 h-3" /> 开始
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 快捷操作 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  快捷操作
                </h2>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link
                  href="/plan/new"
                  className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors group"
                >
                  <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">AI教案</div>
                    <div className="text-xs text-gray-500">智能生成</div>
                  </div>
                </Link>
                <Link
                  href="/training"
                  className="flex items-center gap-3 p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors group"
                >
                  <div className="w-9 h-9 bg-red-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">训练执行</div>
                    <div className="text-xs text-gray-500">签到打分</div>
                  </div>
                </Link>
                <Link
                  href="/assessment"
                  className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors group"
                >
                  <div className="w-9 h-9 bg-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">球员评估</div>
                    <div className="text-xs text-gray-500">能力打分</div>
                  </div>
                </Link>
                <Link
                  href="/players"
                  className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors group"
                >
                  <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">学员管理</div>
                    <div className="text-xs text-gray-500">查看档案</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* 最近教案 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-orange-500" />
                  最近教案
                </h2>
                <Link
                  href="/plans"
                  className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  全部 <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {!data.recentPlans || data.recentPlans.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400">
                  <p>暂无教案</p>
                  <Link href="/plan/new" className="text-orange-500 text-sm mt-1 inline-block">
                    生成第一个教案 →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.recentPlans.map((plan) => (
                    <Link
                      key={plan.id}
                      href={`/plans/${plan.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                        {plan.generatedBy === 'ai' ? (
                          <Sparkles className="w-4 h-4 text-purple-500" />
                        ) : (
                          <ClipboardList className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {plan.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span>{plan.group}</span>
                          <span>·</span>
                          <span>{plan.duration}分钟</span>
                          <span>·</span>
                          <span>{new Date(plan.createdAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 右栏：预警 + 目标 */}
          <div className="space-y-6">
            {/* 课时预警 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  课时预警
                </h2>
                <Link
                  href="/courses"
                  className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  管理 <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {!data.lowHourEnrollments || data.lowHourEnrollments.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-400 text-sm">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-300" />
                  <p>暂无课时预警</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.lowHourEnrollments.map((enrollment) => (
                    <Link
                      key={enrollment.id}
                      href={`/players/${enrollment.playerId}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                          enrollment.remainingHours <= 2
                            ? 'bg-red-500'
                            : enrollment.remainingHours <= 4
                              ? 'bg-amber-500'
                              : 'bg-yellow-500'
                        }`}
                      >
                        {enrollment.remainingHours}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {enrollment.player.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {enrollment.course.name} · 剩{enrollment.remainingHours}课时
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 shrink-0">
                        {enrollment.expireDate &&
                          new Date(enrollment.expireDate).toLocaleDateString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        到期
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 进行中的目标 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-500" />
                  进行中目标
                </h2>
                <Link
                  href="/goals"
                  className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  全部 <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {!data.activeGoals || data.activeGoals.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-400 text-sm">
                  <Target className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>暂无进行中目标</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.activeGoals.map((goal) => (
                    <Link
                      key={goal.id}
                      href={`/players/${goal.playerId}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {goal.playerName}
                          </span>
                          <span className="text-xs text-gray-400">
                            {skillLabels[goal.skillType] || goal.skillType}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                goal.progress >= 80
                                  ? 'bg-green-500'
                                  : goal.progress >= 50
                                    ? 'bg-blue-500'
                                    : 'bg-orange-500'
                              }`}
                              style={{ width: `${Math.min(goal.progress, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 shrink-0">
                            {goal.currentScore}/{goal.targetScore}
                          </span>
                        </div>
                      </div>
                      {goal.targetDate && (
                        <div className="text-xs text-gray-400 shrink-0">
                          {new Date(goal.targetDate).toLocaleDateString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 近7天训练记录 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  近7天训练
                </h2>
                <Link
                  href="/records"
                  className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  全部 <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {!data.recentRecords || data.recentRecords.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-400 text-sm">
                  <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>近7天无训练记录</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.recentRecords.slice(0, 8).map((record) => (
                    <div key={record.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          record.attendance === 'present'
                            ? 'bg-green-100'
                            : record.attendance === 'late'
                              ? 'bg-yellow-100'
                              : 'bg-red-100'
                        }`}
                      >
                        {record.attendance === 'present' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        ) : record.attendance === 'late' ? (
                          <Timer className="w-3.5 h-3.5 text-yellow-600" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {record.playerName}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{record.planTitle}</div>
                      </div>
                      {record.performance && (
                        <span className="text-xs font-medium text-orange-600 shrink-0">
                          {record.performance}分
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
