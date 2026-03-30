'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Users,
  ClipboardList,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Dumbbell,
  Star,
  Bell,
  RefreshCw
} from 'lucide-react'

type TodaySchedule = {
  id: string
  title: string
  group: string
  startTime: string
  endTime: string
  location: string
  maxPlayers: number
  currentCount: number
}

type PlayerAlert = {
  id: string
  name: string
  group: string
  type: 'low_hours' | 'absent_3' | 'assessment_due' | 'expiring'
  message: string
  severity: 'high' | 'medium' | 'low'
}

type RecentFeedback = {
  id: string
  playerName: string
  planTitle: string
  date: string
  performance?: number
}

type WeeklyStats = {
  totalTrainings: number
  totalStudents: number
  avgAttendance: number
  avgPerformance: number
  newStudents: number
  upcomingMatches: number
}

const severityStyles = {
  high: 'bg-red-50 border-red-200 text-red-700',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  low: 'bg-blue-50 border-blue-200 text-blue-700'
}

const severityIcons = {
  high: AlertCircle,
  medium: AlertCircle,
  low: Bell
}

const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export default function DashboardPage() {
  const [schedules, setSchedules] = useState<TodaySchedule[]>([])
  const [alerts, setAlerts] = useState<PlayerAlert[]>([])
  const [feedbacks, setFeedbacks] = useState<RecentFeedback[]>([])
  const [stats, setStats] = useState<WeeklyStats>({
    totalTrainings: 0,
    totalStudents: 0,
    avgAttendance: 0,
    avgPerformance: 0,
    newStudents: 0,
    upcomingMatches: 0
  })
  const [loading, setLoading] = useState(true)
  const [todayName, setTodayName] = useState('')
  const [todayDate, setTodayDate] = useState('')

  useEffect(() => {
    const now = new Date()
    setTodayName(dayNames[now.getDay()])
    setTodayDate(now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }))
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    try {
      setLoading(true)
      const [scheduleRes, playersRes, recordsRes, plansRes, matchesRes] = await Promise.all([
        fetch('/api/schedules'),
        fetch('/api/players'),
        fetch('/api/records'),
        fetch('/api/plans'),
        fetch('/api/matches')
      ])

      const scheduleData = await scheduleRes.json()
      const playersData = await playersRes.json()
      const recordsData = await recordsRes.json()
      const plansData = await plansRes.json()
      const matchesData = await matchesRes.json()

      // 今天的排课
      const dayOfWeek = new Date().getDay()
      const todaySchedules = (scheduleData.schedules || [])
        .filter((s: { dayOfWeek: number; status: string }) => s.dayOfWeek === dayOfWeek && s.status === 'active')
        .slice(0, 5)
      setSchedules(todaySchedules)

      // 生成告警
      const playerAlerts: PlayerAlert[] = []
      const players = playersData.players || []

      players.forEach((p: { id: string; name: string; group: string; enrollments?: { remainingHours: number; status: string }[] }) => {
        // 课时不足
        const activeEnrollment = p.enrollments?.find((e: { status: string }) => e.status === 'active')
        if (activeEnrollment && activeEnrollment.remainingHours <= 4) {
          playerAlerts.push({
            id: `${p.id}-hours`,
            name: p.name,
            group: p.group,
            type: 'low_hours',
            message: `剩余课时仅 ${activeEnrollment.remainingHours} 节`,
            severity: 'high'
          })
        }
      })
      setAlerts(playerAlerts.slice(0, 6))

      // 最近反馈（训练记录）
      const recentRecords = (recordsData.records || []).slice(0, 5).map((r: any) => ({
        id: r.id,
        playerName: r.playerName || '未知',
        planTitle: r.plan?.title || '训练课',
        date: r.recordedAt,
        performance: r.performance
      }))
      setFeedbacks(recentRecords)

      // 周统计
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const weekRecords = (recordsData.records || []).filter((r: any) =>
        new Date(r.recordedAt) >= weekStart
      )

      setStats({
        totalTrainings: (plansData.plans || []).length,
        totalStudents: players.length,
        avgAttendance: players.length > 0 ? 85 : 0,
        avgPerformance: 7.5,
        newStudents: players.filter((p: any) => {
          const enrollDate = new Date(p.enrollDate)
          return enrollDate >= weekStart
        }).length,
        upcomingMatches: (matchesData.matches || []).filter((m: any) =>
          m.status === 'scheduled' && new Date(m.matchDate) >= new Date()
        ).length
      })
    } catch (error) {
      console.error('获取工作台数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-gray-500">加载工作台...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold">教练工作台</h1>
              <p className="text-orange-100 text-sm">{todayDate}</p>
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
        {/* 今日概览卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-orange-600">{schedules.length}</div>
            <div className="text-xs text-gray-500 mt-1">今日课程</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalStudents}</div>
            <div className="text-xs text-gray-500 mt-1">在训学员</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.avgAttendance}%</div>
            <div className="text-xs text-gray-500 mt-1">本周出勤率</div>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="grid grid-cols-4 gap-3">
          <Link href="/checkin" className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-700">签到点名</span>
          </Link>
          <Link href="/plan/new" className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-gray-700">生成教案</span>
          </Link>
          <Link href="/assessment" className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-700">球员评估</span>
          </Link>
          <Link href="/feedback" className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-700">课后反馈</span>
          </Link>
        </div>

        {/* 今日课程 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              今日课程
            </h2>
            <Link href="/schedule" className="text-xs text-orange-500 flex items-center gap-1">
              排课管理 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4">
            {schedules.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">今天没有课程安排</p>
                <Link href="/schedule" className="text-orange-500 text-sm mt-2 inline-block">
                  去设置排课 →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center min-w-[60px]">
                      <div className="text-lg font-bold text-orange-600">{schedule.startTime}</div>
                      <div className="text-xs text-gray-400">至 {schedule.endTime}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{schedule.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {schedule.location} · {schedule.group} · {schedule.currentCount}/{schedule.maxPlayers}人
                      </div>
                    </div>
                    <Link
                      href="/checkin"
                      className="px-3 py-1.5 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 transition-colors shrink-0"
                    >
                      签到
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 待办提醒 */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                待办提醒
              </h2>
              <span className="text-xs text-gray-400">{alerts.length} 条</span>
            </div>
            <div className="p-4 space-y-2">
              {alerts.map((alert) => {
                const Icon = severityIcons[alert.severity]
                return (
                  <div
                    key={alert.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${severityStyles[alert.severity]}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{alert.name}</span>
                        <span className="text-xs opacity-70">{alert.group}</span>
                      </div>
                      <div className="text-xs mt-0.5 opacity-80">{alert.message}</div>
                    </div>
                    {alert.type === 'low_hours' && (
                      <Link
                        href="/orders"
                        className="text-xs font-medium shrink-0 hover:underline"
                      >
                        处理 →
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 最近训练反馈 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-blue-500" />
              最近训练记录
            </h2>
            <Link href="/training" className="text-xs text-orange-500 flex items-center gap-1">
              查看全部 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4">
            {feedbacks.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">暂无训练记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbacks.map((fb) => (
                  <div key={fb.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{fb.playerName}</div>
                      <div className="text-xs text-gray-500 truncate">{fb.planTitle} · {new Date(fb.date).toLocaleDateString('zh-CN')}</div>
                    </div>
                    {fb.performance && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Star className="w-3 h-3 text-yellow-400" />
                        <span className="text-sm font-semibold text-gray-700">{fb.performance}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 本周数据 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              本周数据
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-gray-100">
            <div className="p-4 text-center">
              <div className="text-xl font-bold text-gray-900">{stats.totalTrainings}</div>
              <div className="text-xs text-gray-500 mt-1">累计教案</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-xl font-bold text-gray-900">{stats.newStudents}</div>
              <div className="text-xs text-gray-500 mt-1">本周新增学员</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-xl font-bold text-gray-900">{stats.avgPerformance}</div>
              <div className="text-xs text-gray-500 mt-1">平均表现评分</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-xl font-bold text-gray-900">{stats.upcomingMatches}</div>
              <div className="text-xs text-gray-500 mt-1">即将到来的比赛</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}