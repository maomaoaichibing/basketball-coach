'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import UserMenu from '@/components/UserMenu';
import CoachDashboard from '@/components/coach-dashboard';
import { fetchWithAuth } from '@/lib/auth';
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  FileText,
  Lightbulb,
  LayoutDashboard,
  Medal,
  Menu,
  MessageCircle,
  Mic,
  Package,
  Play,
  Plus,
  Receipt,
  Sparkles,
  Target,
  Ticket,
  Trophy,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react';

// 统计数据类型
type Stats = {
  totalPlayers: number;
  totalPlans: number;
  totalFeedback: number;
  totalAssessments: number;
};

// 教案类型
type TrainingPlan = {
  id: string;
  title: string;
  date: string;
  duration: number;
  group: string;
  location: string;
  weather?: string;
  theme?: string;
  focusSkills?: string[];
  intensity?: string;
  status?: string;
  generatedBy?: string;
  sections?: unknown[];
};

export default function Home() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState('U10');
  const [recentPlans, setRecentPlans] = useState<TrainingPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCoachDashboard, setShowCoachDashboard] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalPlayers: 0,
    totalPlans: 0,
    totalFeedback: 0,
    totalAssessments: 0,
  });

  useEffect(() => {
    // 等待认证状态加载完成后再获取数据
    if (isLoading) {
      return;
    }
    // 获取公开数据（登录/未登录都显示）
    fetchRecentPlans();
    fetchStats();
  }, [isLoading]);

  async function fetchStats() {
    try {
      const [playersRes, plansRes, recordsRes, assessmentsRes] = await Promise.all([
        fetchWithAuth('/api/players'),
        fetchWithAuth('/api/plans'),
        fetchWithAuth('/api/records'),
        fetchWithAuth('/api/assessments'),
      ]);
      const playersData = await playersRes.json();
      const plansData = await plansRes.json();
      const recordsData = await recordsRes.json();
      const assessmentsData = await assessmentsRes.json();

      setStats({
        totalPlayers: playersData.total || 0,
        totalPlans: plansData.total || 0,
        totalFeedback: recordsData.total || 0,
        totalAssessments: assessmentsData.total || 0,
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  }

  async function fetchRecentPlans() {
    try {
      setLoadingPlans(true);
      const response = await fetchWithAuth('/api/plans?limit=6');
      const data = await response.json();

      if (data.success) {
        const parsedPlans = data.plans.map((plan: unknown) => {
          const p = plan as Record<string, unknown>;
          return {
            ...p,
            focusSkills: p.focusSkills ? JSON.parse(String(p.focusSkills)) : [],
            sections: p.sections ? JSON.parse(String(p.sections)) : [],
          } as TrainingPlan;
        });
        setRecentPlans(parsedPlans);
      }
    } catch (error) {
      console.error('获取最近教案失败:', error);
    } finally {
      setLoadingPlans(false);
    }
  }

  const groups = [
    { id: 'U6', name: 'U6', age: '4-6岁', desc: '启蒙阶段' },
    { id: 'U8', name: 'U8', age: '7-8岁', desc: '基础阶段' },
    { id: 'U10', name: 'U10', age: '9-10岁', desc: '发展阶段' },
    { id: 'U12', name: 'U12', age: '11-12岁', desc: '提高阶段' },
    { id: 'U14', name: 'U14', age: '13-14岁', desc: '青少年阶段' },
  ];

  return (
    <div className="min-h-screen">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg sm:text-xl font-bold">篮球青训教案系统</h1>
                    <span className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full font-medium hidden sm:inline">
                      v5.12.0
                    </span>
                  </div>
                  <p className="text-orange-100 text-sm hidden sm:block">
                    智能教案生成 · 球员成长追踪
                  </p>
                </div>
              </Link>
            </div>

            {/* 桌面端导航 */}
            <div className="hidden sm:flex items-center gap-2">
              {!isLoading && !isAuthenticated ? (
                <>
                  <Link href="/login" className="px-3 py-1.5 text-sm hover:bg-white/10 rounded-lg">
                    登录
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-1.5 text-sm bg-white text-orange-600 hover:bg-orange-50 rounded-lg font-medium"
                  >
                    注册
                  </Link>
                </>
              ) : !isLoading && isAuthenticated ? (
                <UserMenu />
              ) : null}
              <Link
                href="/version"
                className="px-3 py-1.5 text-sm hover:bg-white/10 rounded-lg flex items-center gap-1"
              >
                <span>版本管理</span>
              </Link>
              <Link
                href="/prompts"
                className="px-3 py-1.5 text-sm hover:bg-white/10 rounded-lg flex items-center gap-1"
              >
                <span>Prompt管理</span>
              </Link>
            </div>

            {/* 移动端汉堡菜单按钮 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 hover:bg-white/10 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* 移动端菜单 */}
          {mobileMenuOpen && (
            <div className="sm:hidden mt-4 pt-4 border-t border-white/20 space-y-2">
              {!isLoading && !isAuthenticated && (
                <>
                  <Link
                    href="/login"
                    className="block px-3 py-2 text-sm hover:bg-white/10 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    登录
                  </Link>
                  <Link
                    href="/register"
                    className="block px-3 py-2 text-sm hover:bg-white/10 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    注册
                  </Link>
                </>
              )}
              {!isLoading && isAuthenticated && (
                <>
                  <div className="px-3 py-2 text-sm text-orange-100">
                    {user?.name || user?.email}
                  </div>
                  <Link
                    href="/settings"
                    className="block px-3 py-2 text-sm hover:bg-white/10 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    个人设置
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm text-red-200 hover:bg-white/10 rounded-lg"
                  >
                    退出登录
                  </button>
                </>
              )}
              <Link
                href="/version"
                className="block px-3 py-2 text-sm hover:bg-white/10 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                版本管理
              </Link>
              <Link
                href="/prompts"
                className="block px-3 py-2 text-sm hover:bg-white/10 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Prompt管理
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 统计概览 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalPlayers}</div>
                <div className="text-sm text-gray-500">学员总数</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalPlans}</div>
                <div className="text-sm text-gray-500">教案总数</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalFeedback}</div>
                <div className="text-sm text-gray-500">课后反馈</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalAssessments}</div>
                <div className="text-sm text-gray-500">成长记录</div>
              </div>
            </div>
          </div>
        </div>

        {/* 快速操作 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* 教练工作台入口 - 仅登录用户可见 */}
          {isAuthenticated && (
            <button
              onClick={() => setShowCoachDashboard(true)}
              className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-white group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">教练工作台</h3>
                  <p className="text-sm text-orange-100">今日课程 · 预警</p>
                </div>
              </div>
            </button>
          )}
          {!isAuthenticated && (
            <Link
              href="/login"
              className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-white group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">教练工作台</h3>
                  <p className="text-sm text-orange-100">登录后使用</p>
                </div>
              </div>
            </Link>
          )}
          <Link
            href="/plan/new"
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                <Plus className="w-6 h-6 text-orange-600 group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">生成教案</h3>
                <p className="text-sm text-gray-500">AI 智能生成</p>
              </div>
            </div>
          </Link>

          <Link
            href="/training"
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                <Plus className="w-6 h-6 text-orange-600 group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">生成教案</h3>
                <p className="text-sm text-gray-500">AI 智能生成</p>
              </div>
            </div>
          </Link>

          <Link
            href="/training"
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-500 transition-colors">
                <Play className="w-6 h-6 text-red-600 group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">训练执行</h3>
                <p className="text-sm text-gray-500">开始训练课</p>
              </div>
            </div>
          </Link>

          <Link
            href="/players"
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                <Users className="w-6 h-6 text-blue-600 group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">球员管理</h3>
                <p className="text-sm text-gray-500">查看和评估</p>
              </div>
            </div>
          </Link>

          <Link
            href="/assessment"
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                <Trophy className="w-6 h-6 text-purple-600 group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">球员评估</h3>
                <p className="text-sm text-gray-500">打分记录</p>
              </div>
            </div>
          </Link>
        </div>

        {/* 年龄段选择 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">选择训练年龄段</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className={`p-4 rounded-xl text-left transition-all ${
                  selectedGroup === group.id
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'bg-white border border-gray-200 hover:border-orange-300'
                }`}
              >
                <div
                  className={`font-bold text-lg ${selectedGroup === group.id ? 'text-white' : 'text-gray-900'}`}
                >
                  {group.name}
                </div>
                <div
                  className={`text-sm ${selectedGroup === group.id ? 'text-orange-100' : 'text-gray-500'}`}
                >
                  {group.age}
                </div>
                <div
                  className={`text-xs mt-1 ${selectedGroup === group.id ? 'text-orange-200' : 'text-gray-400'}`}
                >
                  {group.desc}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 最近教案 */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">最近教案</h2>
            <Link
              href="/plans"
              className="text-orange-600 hover:text-orange-700 text-sm flex items-center gap-1"
            >
              查看全部 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {loadingPlans ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : recentPlans.length === 0 ? (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无教案</h3>
              <p className="text-gray-500 mb-4">还没有生成过教案</p>
              <Link href="/plan/new" className="text-orange-600 hover:text-orange-700">
                开始生成第一个教案 →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentPlans.slice(0, 3).map((plan) => (
                <Link
                  key={plan.id}
                  href={`/plans/${plan.id}`}
                  className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {new Date(plan.date).toLocaleDateString('zh-CN', {
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {plan.generatedBy === 'ai' && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          AI
                        </span>
                      )}
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                        {plan.group}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{plan.title}</h3>
                  {plan.theme && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-1">{plan.theme}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{plan.duration}分钟</span>
                    <span>{plan.location}</span>
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" /> {plan.sections?.length || 5}项内容
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 快捷功能 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷功能</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <Link
              href="/voice"
              className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center text-white"
            >
              <Mic className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm font-medium">语音生成教案</span>
            </Link>
            <Link
              href="/checkin"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <Activity className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">签到点名</span>
            </Link>
            <Link
              href="/training"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <Play className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">训练执行</span>
            </Link>
            <Link
              href="/goals"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <Target className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">阶段目标</span>
            </Link>
            <Link
              href="/growth"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">成长追踪</span>
            </Link>
            <Link
              href="/assessment"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <Trophy className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">球员评估</span>
            </Link>
            <Link
              href="/feedback"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <ClipboardList className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">课后反馈</span>
            </Link>
            <Link
              href="/courses"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <Package className="w-8 h-8 text-cyan-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">课时管理</span>
            </Link>
            <Link
              href="/schedule"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <CalendarDays className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">课程安排</span>
            </Link>
            <Link
              href="/booking"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <Ticket className="w-8 h-8 text-pink-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">课程预约</span>
            </Link>
            <Link
              href="/parent"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <User className="w-8 h-8 text-teal-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">家长端</span>
            </Link>
            <Link
              href="/orders"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <Receipt className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">订单管理</span>
            </Link>
            <Link
              href="/notifications"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <Bell className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">通知管理</span>
            </Link>
            <Link
              href="/campuses"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <Building2 className="w-8 h-8 text-violet-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">多校区管理</span>
            </Link>
            <Link
              href="/recommendations"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <Lightbulb className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">智能推荐</span>
            </Link>
            <Link
              href="/stats"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <BarChart3 className="w-8 h-8 text-cyan-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">数据统计</span>
            </Link>
            <Link
              href="/training-analysis"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <Activity className="w-8 h-8 text-teal-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">训练分析</span>
            </Link>
            <Link
              href="/matches"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <Medal className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">比赛记录</span>
            </Link>
            <Link
              href="/growth-reports"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <FileText className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">成长档案</span>
            </Link>
            <Link
              href="/interaction"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <MessageCircle className="w-8 h-8 text-pink-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">家校互动</span>
            </Link>
            <Link
              href="/analytics"
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <Sparkles className="w-8 h-8 text-violet-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">智能分析</span>
            </Link>
          </div>
        </section>

        {/* v4.2 智能分析 标识 */}
        <section className="mt-8 p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-violet-500 text-white text-xs rounded-full font-medium">
              v4.2
            </span>
            <span className="text-sm font-medium text-gray-700">智能分析功能已上线</span>
          </div>
          <p className="text-sm text-gray-500">AI训练建议 · 能力分析报告 · 智能分班推荐</p>
        </section>
      </main>

      {/* 教练工作台弹窗 */}
      {showCoachDashboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCoachDashboard(false)}
          />
          {/* 工作台内容 */}
          <div className="relative w-full max-w-7xl mx-4 max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
            {/* 关闭按钮 */}
            <button
              onClick={() => setShowCoachDashboard(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <CoachDashboard />
          </div>
        </div>
      )}
    </div>
  );
}
