'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/auth';
import { useAuth } from '@/components/AuthProvider';
import {
  Calendar,
  Users,
  ClipboardList,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Dumbbell,
  Star,
  Bell,
  RefreshCw,
  BarChart3,
  Target,
  Award,
  Flame,
  Timer,
} from 'lucide-react';

// ============ 类型定义 ============

type TodaySchedule = {
  id: string;
  title: string;
  group: string;
  startTime: string;
  endTime: string;
  location: string;
  maxPlayers: number;
  currentCount: number;
};

type PlayerAlert = {
  id: string;
  name: string;
  group: string;
  type: 'low_hours' | 'absent_3' | 'assessment_due' | 'expiring';
  message: string;
  severity: 'high' | 'medium' | 'low';
};

type RecentFeedback = {
  id: string;
  playerName: string;
  planTitle: string;
  date: string;
  performance?: number;
};

type WeeklyStats = {
  totalTrainings: number;
  totalStudents: number;
  avgAttendance: number;
  avgPerformance: number;
  newStudents: number;
  upcomingMatches: number;
};

type Match = {
  id: string;
  status: string;
  matchDate: string;
};

type TrainingRecord = {
  id: string;
  playerId?: string;
  playerName?: string;
  recordedAt: string;
  performance?: number;
  effort?: number;
  attitude?: number;
  attendance: string;
  plan?: { title: string; theme?: string; date?: string };
  planId: string;
};

type TrainingPlan = {
  id: string;
  title?: string;
  date?: string;
  group?: string;
  theme?: string;
};

type Player = {
  id: string;
  name: string;
  group: string;
  enrollDate: string;
  enrollments?: { remainingHours: number; status: string }[];
};

// ============ 常量 ============

const severityStyles = {
  high: 'bg-red-50 border-red-200 text-red-700',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  low: 'bg-blue-50 border-blue-200 text-blue-700',
};

const severityIcons = {
  high: AlertCircle,
  medium: AlertCircle,
  low: Bell,
};

const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const dayNamesShort = ['日', '一', '二', '三', '四', '五', '六'];
const groupColors: Record<string, { bg: string; text: string; light: string }> = {
  U6: { bg: 'bg-yellow-400', text: 'text-yellow-700', light: 'bg-yellow-50' },
  U8: { bg: 'bg-orange-400', text: 'text-orange-700', light: 'bg-orange-50' },
  U10: { bg: 'bg-blue-400', text: 'text-blue-700', light: 'bg-blue-50' },
  U12: { bg: 'bg-green-400', text: 'text-green-700', light: 'bg-green-50' },
  U14: { bg: 'bg-purple-400', text: 'text-purple-700', light: 'bg-purple-50' },
};

// ============ SVG 图表组件 ============

function MiniLineChart({
  data,
  color = '#f97316',
  height = 48,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 120;
  const padding = 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${width - padding},${height} L ${padding},${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((v, i) => {
        const x = padding + (i / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - ((v - min) / range) * (height - padding * 2);
        return (
          <circle key={i} cx={x} cy={y} r="2.5" fill="white" stroke={color} strokeWidth="1.5" />
        );
      })}
    </svg>
  );
}

function ProgressRing({
  value,
  max = 100,
  size = 56,
  strokeWidth = 5,
  color = '#22c55e',
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-gray-900 font-bold"
        style={{ fontSize: size * 0.24, transform: 'rotate(90deg)', transformOrigin: 'center' }}
      >
        {value}%
      </text>
    </svg>
  );
}

// ============ 主页面 ============

export default function DashboardPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<TodaySchedule[]>([]);
  const [alerts, setAlerts] = useState<PlayerAlert[]>([]);
  const [feedbacks, setFeedbacks] = useState<RecentFeedback[]>([]);
  const [stats, setStats] = useState<WeeklyStats>({
    totalTrainings: 0,
    totalStudents: 0,
    avgAttendance: 0,
    avgPerformance: 0,
    newStudents: 0,
    upcomingMatches: 0,
  });
  const [loading, setLoading] = useState(true);
  const [todayName, setTodayName] = useState('');
  const [todayDate, setTodayDate] = useState('');

  // 高级统计数据
  const [weeklyAttendanceData, setWeeklyAttendanceData] = useState<number[]>([]);
  const [weeklyPerformanceData, setWeeklyPerformanceData] = useState<number[]>([]);
  const [weekDayLabels, setWeekDayLabels] = useState<string[]>([]);
  const [themeDistribution, setThemeDistribution] = useState<
    { name: string; count: number; color: string }[]
  >([]);
  const [topPlayers, setTopPlayers] = useState<
    { name: string; group: string; avgPerformance: number; attendance: number; sessions: number }[]
  >([]);
  const [totalTrainingMinutes, setTotalTrainingMinutes] = useState(0);

  useEffect(() => {
    const now = new Date();
    setTodayName(dayNames[now.getDay()]);
    setTodayDate(
      now.toLocaleDateString('zh-CN', {
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      })
    );
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      setLoading(true);
      const [scheduleRes, playersRes, recordsRes, plansRes, matchesRes] = await Promise.all([
        fetchWithAuth('/api/schedules'),
        fetchWithAuth('/api/players'),
        fetchWithAuth('/api/records?limit=200'),
        fetchWithAuth('/api/plans?limit=50'),
        fetchWithAuth('/api/matches'),
      ]);

      const scheduleData = await scheduleRes.json();
      const playersData = await playersRes.json();
      const recordsData = await recordsRes.json();
      const plansData = await plansRes.json();
      const matchesData = await matchesRes.json();

      const allRecords: TrainingRecord[] = recordsData.records || [];
      const allPlans: TrainingPlan[] = plansData.plans || [];
      const players: Player[] = playersData.players || [];

      // 今天的排课
      const dayOfWeek = new Date().getDay();
      const todaySchedules = (scheduleData.schedules || [])
        .filter(
          (s: { dayOfWeek: number; status: string }) =>
            s.dayOfWeek === dayOfWeek && s.status === 'active'
        )
        .slice(0, 5);
      setSchedules(todaySchedules);

      if (todaySchedules.length === 0) {
        const todayPlans = allPlans.filter((p: { date?: string }) => {
          if (!p.date) return false;
          const planDate = new Date(p.date);
          const today = new Date();
          return (
            planDate.getFullYear() === today.getFullYear() &&
            planDate.getMonth() === today.getMonth() &&
            planDate.getDate() === today.getDate()
          );
        });
        if (todayPlans.length > 0) {
          setSchedules(
            todayPlans.slice(0, 5).map((p: { id: string; title?: string; group?: string }) => ({
              id: p.id,
              title: p.title || '训练课',
              group: p.group || '',
              startTime: '',
              endTime: '',
              location: '',
              maxPlayers: 0,
              currentCount: 0,
            }))
          );
        }
      }

      // 生成告警
      const playerAlerts: PlayerAlert[] = [];
      players.forEach((p: Player) => {
        const activeEnrollment = p.enrollments?.find(
          (e: { status: string }) => e.status === 'active'
        );
        if (activeEnrollment && activeEnrollment.remainingHours <= 4) {
          playerAlerts.push({
            id: `${p.id}-hours`,
            name: p.name,
            group: p.group,
            type: 'low_hours',
            message: `剩余课时仅 ${activeEnrollment.remainingHours} 节`,
            severity: 'high',
          });
        }
      });
      setAlerts(playerAlerts.slice(0, 6));

      // 最近反馈
      const recentRecords = allRecords.slice(0, 5).map((r: TrainingRecord) => ({
        id: r.id,
        playerName: r.playerName || '未知',
        planTitle: r.plan?.title || '训练课',
        date: r.recordedAt,
        performance: r.performance,
      }));
      setFeedbacks(recentRecords);

      // 本周统计数据
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weekRecords = allRecords.filter(
        (r: TrainingRecord) => new Date(r.recordedAt) >= weekStart
      );

      const weekPresentCount = weekRecords.filter(
        (r: TrainingRecord) => r.attendance === 'present' || r.attendance === 'late'
      ).length;
      const realAvgAttendance =
        weekRecords.length > 0 ? Math.round((weekPresentCount / weekRecords.length) * 100) : 0;

      const weekScoredRecords = weekRecords.filter(
        (r: TrainingRecord) => r.performance && r.performance > 0
      );
      const realAvgPerformance =
        weekScoredRecords.length > 0
          ? Number(
              (
                weekScoredRecords.reduce(
                  (sum: number, r: TrainingRecord) => sum + (r.performance || 0),
                  0
                ) / weekScoredRecords.length
              ).toFixed(1)
            )
          : 0;

      setStats({
        totalTrainings: allPlans.length,
        totalStudents: players.length,
        avgAttendance: realAvgAttendance,
        avgPerformance: realAvgPerformance,
        newStudents: players.filter((p: Player) => new Date(p.enrollDate) >= weekStart).length,
        upcomingMatches: (matchesData.matches || []).filter(
          (m: Match) => m.status === 'scheduled' && new Date(m.matchDate) >= new Date()
        ).length,
      });

      // ---- 高级统计 ----

      // 1. 近7天每日出勤率
      const dailyAttendance: number[] = [];
      const dailyLabels: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date();
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const dayRecords = allRecords.filter((r: TrainingRecord) => {
          const d = new Date(r.recordedAt);
          return d >= dayStart && d < dayEnd;
        });
        const present = dayRecords.filter(
          (r: TrainingRecord) => r.attendance === 'present' || r.attendance === 'late'
        ).length;
        dailyAttendance.push(
          dayRecords.length > 0 ? Math.round((present / dayRecords.length) * 100) : 0
        );
        dailyLabels.push(dayNamesShort[dayStart.getDay()]);
      }
      setWeeklyAttendanceData(dailyAttendance);
      setWeekDayLabels(dailyLabels);

      // 2. 近7天平均表现分
      const dailyPerformance: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date();
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const dayRecords = allRecords.filter((r: TrainingRecord) => {
          const d = new Date(r.recordedAt);
          return d >= dayStart && d < dayEnd && r.performance && r.performance > 0;
        });
        if (dayRecords.length > 0) {
          const avg =
            dayRecords.reduce((sum: number, r: TrainingRecord) => sum + (r.performance || 0), 0) /
            dayRecords.length;
          dailyPerformance.push(Number(avg.toFixed(1)));
        } else {
          dailyPerformance.push(0);
        }
      }
      setWeeklyPerformanceData(dailyPerformance);

      // 3. 本周训练主题分布
      const themeCounts: Record<string, number> = {};
      const themeColors = [
        '#f97316',
        '#3b82f6',
        '#8b5cf6',
        '#22c55e',
        '#ef4444',
        '#06b6d4',
        '#eab308',
      ];
      weekRecords.forEach((r: TrainingRecord) => {
        const theme = r.plan?.theme || r.plan?.title || '未分类';
        if (theme && theme.length < 20) {
          themeCounts[theme] = (themeCounts[theme] || 0) + 1;
        }
      });
      const sortedThemes = Object.entries(themeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      setThemeDistribution(
        sortedThemes.map(([name, count], i) => ({
          name: name.length > 10 ? name.slice(0, 10) + '...' : name,
          count,
          color: themeColors[i % themeColors.length],
        }))
      );

      // 4. 学员表现排行榜 Top 5
      const playerPerformance: Record<
        string,
        { name: string; group: string; totalPerf: number; count: number; presentCount: number }
      > = {};
      weekRecords.forEach((r: TrainingRecord) => {
        if (!r.playerId || !r.playerName) return;
        if (!playerPerformance[r.playerId]) {
          playerPerformance[r.playerId] = {
            name: r.playerName,
            group: (r as unknown as { playerGroup?: string }).playerGroup || '',
            totalPerf: 0,
            count: 0,
            presentCount: 0,
          };
        }
        const pp = playerPerformance[r.playerId];
        pp.count++;
        if (r.performance) pp.totalPerf += r.performance;
        if (r.attendance === 'present' || r.attendance === 'late') pp.presentCount++;
      });
      const rankedPlayers = Object.values(playerPerformance)
        .filter((p) => p.count >= 2)
        .map((p) => ({
          ...p,
          avgPerformance: Number((p.totalPerf / p.count).toFixed(1)),
          attendance: Math.round((p.presentCount / p.count) * 100),
          sessions: p.count,
        }))
        .sort((a, b) => b.avgPerformance - a.avgPerformance)
        .slice(0, 5);
      setTopPlayers(rankedPlayers);

      // 5. 本周训练总时长
      const weekPlanIds = new Set(weekRecords.map((r: TrainingRecord) => r.planId));
      const weekPlans = allPlans.filter((p: TrainingPlan) => weekPlanIds.has(p.id));
      const totalMinutes = weekPlans.reduce((sum: number, p: TrainingPlan) => {
        // 从 title 或 sections 中提取时长，默认90分钟
        const durationMatch = (p.title || '').match(/(\d+)min/);
        return sum + (durationMatch ? parseInt(durationMatch[1]) : 90);
      }, 0);
      setTotalTrainingMinutes(totalMinutes);
    } catch (error) {
      console.error('获取工作台数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  // ============ 渲染 ============

  // 个性化问候语
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了';
    if (hour < 11) return '早上好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-gray-500">加载工作台...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {/* 头像 */}
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="头像"
                  className="w-11 h-11 rounded-full object-cover border-2 border-white/30"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center">
                  <span className="text-lg font-bold">{user?.name?.charAt(0) || 'U'}</span>
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold">
                  {greeting}，{user?.name || '教练'}！
                </h1>
                <p className="text-orange-100 text-sm">
                  {todayDate}
                  {schedules.length > 0 && (
                    <span className="ml-2">· 今天有 {schedules.length} 节课</span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={fetchDashboard}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="刷新"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* ===== 核心指标卡片 ===== */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">本周出勤率</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{stats.avgAttendance}%</div>
              </div>
              <ProgressRing
                value={stats.avgAttendance}
                size={56}
                strokeWidth={5}
                color={
                  stats.avgAttendance >= 80
                    ? '#22c55e'
                    : stats.avgAttendance >= 60
                      ? '#f59e0b'
                      : '#ef4444'
                }
              />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">平均表现评分</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.avgPerformance || '--'}
                </div>
              </div>
              <ProgressRing
                value={(stats.avgPerformance || 0) * 10}
                max={100}
                size={56}
                strokeWidth={5}
                color={
                  stats.avgPerformance >= 7
                    ? '#3b82f6'
                    : stats.avgPerformance >= 5
                      ? '#f59e0b'
                      : '#ef4444'
                }
              />
            </div>
          </div>
        </div>

        {/* 次要指标行 */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-1">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-bold text-gray-900">{stats.totalStudents}</div>
            <div className="text-[10px] text-gray-500">在训学员</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-1">
              <ClipboardList className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-lg font-bold text-gray-900">{stats.totalTrainings}</div>
            <div className="text-[10px] text-gray-500">累计教案</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-1">
              <Timer className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-lg font-bold text-gray-900">
              {Math.round(totalTrainingMinutes / 60)}
            </div>
            <div className="text-[10px] text-gray-500">本周课时</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-1">
              <Flame className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-lg font-bold text-gray-900">{stats.newStudents}</div>
            <div className="text-[10px] text-gray-500">本周新增</div>
          </div>
        </div>

        {/* ===== 近7天趋势 ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              近7天趋势
            </h2>
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" /> 出勤率
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> 表现分
              </span>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-2">出勤率 (%)</div>
                <MiniLineChart data={weeklyAttendanceData} color="#22c55e" height={48} />
                <div className="flex justify-between mt-1">
                  {weekDayLabels.map((d, i) => (
                    <span key={i} className="text-[9px] text-gray-400">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-2">平均表现 (分)</div>
                <MiniLineChart data={weeklyPerformanceData} color="#3b82f6" height={48} />
                <div className="flex justify-between mt-1">
                  {weekDayLabels.map((d, i) => (
                    <span key={i} className="text-[9px] text-gray-400">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 本周训练主题分布 + 学员表现排行 ===== */}
        <div className="grid grid-cols-2 gap-3">
          {/* 训练主题分布 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-blue-500" />
                本周训练主题
              </h2>
            </div>
            <div className="p-4">
              {themeDistribution.length > 0 ? (
                <div className="space-y-2">
                  {themeDistribution.map((t, i) => {
                    const maxCount = themeDistribution[0].count || 1;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: t.color }}
                        />
                        <span className="text-xs text-gray-600 flex-1 truncate">{t.name}</span>
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${(t.count / maxCount) * 100}%`,
                              backgroundColor: t.color,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 w-6 text-right">
                          {t.count}次
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-4">暂无本周训练数据</p>
              )}
            </div>
          </div>

          {/* 学员表现排行 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <Award className="w-4 h-4 text-yellow-500" />
                本周表现排行
              </h2>
              <Link href="/training-analysis" className="text-[10px] text-orange-500">
                详情 →
              </Link>
            </div>
            <div className="p-4">
              {topPlayers.length > 0 ? (
                <div className="space-y-2">
                  {topPlayers.map((p, i) => {
                    const gc = groupColors[p.group] || groupColors.U10;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                            i === 0
                              ? 'bg-yellow-400'
                              : i === 1
                                ? 'bg-gray-400'
                                : i === 2
                                  ? 'bg-orange-400'
                                  : 'bg-gray-300'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium text-gray-900 truncate">
                              {p.name}
                            </span>
                            <span className={`text-[9px] px-1 rounded ${gc.light} ${gc.text}`}>
                              {p.group}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-400">
                              均分 {p.avgPerformance}
                            </span>
                            <span className="text-[10px] text-gray-400">出勤 {p.attendance}%</span>
                          </div>
                        </div>
                        <div className="w-10 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-orange-400"
                            style={{ width: `${p.avgPerformance * 10}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-4">暂无评分数据</p>
              )}
            </div>
          </div>
        </div>

        {/* ===== 快捷操作 ===== */}
        <div className="grid grid-cols-4 gap-3">
          <Link
            href="/checkin"
            className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col items-center gap-1.5 hover:shadow-md transition-shadow"
          >
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-[11px] font-medium text-gray-700">签到点名</span>
          </Link>
          <Link
            href="/plan/new"
            className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col items-center gap-1.5 hover:shadow-md transition-shadow"
          >
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-orange-600" />
            </div>
            <span className="text-[11px] font-medium text-gray-700">生成教案</span>
          </Link>
          <Link
            href="/assessment"
            className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col items-center gap-1.5 hover:shadow-md transition-shadow"
          >
            <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
              <Star className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-[11px] font-medium text-gray-700">球员评估</span>
          </Link>
          <Link
            href="/training-analysis"
            className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col items-center gap-1.5 hover:shadow-md transition-shadow"
          >
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-[11px] font-medium text-gray-700">训练分析</span>
          </Link>
        </div>

        {/* ===== 今日课程 ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-orange-500" />
              今日课程
              <span className="text-[10px] text-gray-400 font-normal">({todayName})</span>
            </h2>
            <Link href="/schedule" className="text-[10px] text-orange-500 flex items-center gap-1">
              排课管理 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4">
            {schedules.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">今天没有课程安排</p>
                <Link href="/schedule" className="text-orange-500 text-xs mt-2 inline-block">
                  去设置排课 →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="text-center min-w-[50px]">
                      <div className="text-base font-bold text-orange-600">
                        {schedule.startTime}
                      </div>
                      <div className="text-[10px] text-gray-400">至 {schedule.endTime}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">
                        {schedule.title}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {schedule.location && `${schedule.location} · `}
                        {schedule.group}
                        {schedule.maxPlayers > 0 &&
                          ` · ${schedule.currentCount}/${schedule.maxPlayers}人`}
                      </div>
                    </div>
                    <Link
                      href="/checkin"
                      className="px-3 py-1.5 bg-orange-500 text-white text-[10px] rounded-lg hover:bg-orange-600 transition-colors shrink-0"
                    >
                      签到
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== 待办提醒 ===== */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                待办提醒
              </h2>
              <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                {alerts.length} 条
              </span>
            </div>
            <div className="p-4 space-y-2">
              {alerts.map((alert) => {
                const Icon = severityIcons[alert.severity];
                return (
                  <div
                    key={alert.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${severityStyles[alert.severity]}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs">{alert.name}</span>
                        <span className="text-[10px] opacity-70">{alert.group}</span>
                      </div>
                      <div className="text-[10px] mt-0.5 opacity-80">{alert.message}</div>
                    </div>
                    {alert.type === 'low_hours' && (
                      <Link
                        href="/orders"
                        className="text-[10px] font-medium shrink-0 hover:underline"
                      >
                        处理 →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== 最近训练记录 ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              <Dumbbell className="w-4 h-4 text-blue-500" />
              最近训练记录
            </h2>
            <Link href="/records" className="text-[10px] text-orange-500 flex items-center gap-1">
              查看全部 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4">
            {feedbacks.length === 0 ? (
              <div className="text-center py-6">
                <ClipboardList className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">暂无训练记录</p>
              </div>
            ) : (
              <div className="space-y-2">
                {feedbacks.map((fb) => (
                  <div key={fb.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs text-gray-900 truncate">
                        {fb.playerName}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate">
                        {fb.planTitle} · {new Date(fb.date).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                    {fb.performance && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Star className="w-3 h-3 text-yellow-400" />
                        <span className="text-sm font-semibold text-gray-700">
                          {fb.performance}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
