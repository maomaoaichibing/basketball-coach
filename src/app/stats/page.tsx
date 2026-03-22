'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  TrendingUp,
  ShoppingCart,
  Calendar,
  Ticket,
  DollarSign,
  UserPlus,
  Activity,
  BarChart3,
  PieChart
} from 'lucide-react'

interface Stats {
  period: string
  overview: {
    totalPlayers: number
    activePlayers: number
    trialPlayers: number
    newPlayersThisPeriod: number
    totalIncome: number
    monthIncome: number
    totalOrders: number
    pendingOrders: number
    paidOrders: number
    ordersThisPeriod: number
    totalRecords: number
    recordsThisPeriod: number
    attendanceRate: number
    totalHoursRemaining: number
    totalHoursUsed: number
  }
  playersByGroup: { group: string; _count: number }[]
  incomeTrend: { date: string; amount: number }[]
  courseSales: { name: string; _count: number; _sum: { subtotal: number } }[]
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [period])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stats?period=${period}`)
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
    setLoading(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const maxIncome = stats?.incomeTrend?.reduce((max, item) => Math.max(max, item.amount), 0) || 1

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">数据统计</h1>
                <p className="text-sm text-gray-500">经营数据概览与分析</p>
              </div>
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="day">今日</option>
              <option value="week">本周</option>
              <option value="month">本月</option>
              <option value="year">本年</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-gray-500">加载中...</div>
        </div>
      ) : stats ? (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">学员总数</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.overview.totalPlayers}</div>
              <div className="text-xs text-green-600 mt-1">
                +{stats.overview.newPlayersThisPeriod} 本周期新增
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm text-gray-500">总收入</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.overview.totalIncome)}</div>
              <div className="text-xs text-gray-500 mt-1">
                本月 {formatCurrency(stats.overview.monthIncome)}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-sm text-gray-500">订单总数</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.overview.totalOrders}</div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.overview.pendingOrders} 待支付
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm text-gray-500">训练课时</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.overview.totalRecords}</div>
              <div className="text-xs text-gray-500 mt-1">
                本周期 +{stats.overview.recordsThisPeriod}
              </div>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-gray-500 mb-1">在读学员</div>
              <div className="text-xl font-bold text-blue-600">{stats.overview.activePlayers}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-gray-500 mb-1">试训学员</div>
              <div className="text-xl font-bold text-orange-600">{stats.overview.trialPlayers}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-gray-500 mb-1">出勤率</div>
              <div className="text-xl font-bold text-green-600">{stats.overview.attendanceRate}%</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-gray-500 mb-1">剩余课时</div>
              <div className="text-xl font-bold text-purple-600">{stats.overview.totalHoursRemaining}</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Trend */}
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">收入趋势</h3>
                <TrendingUp className="w-5 h-5 text-gray-400" />
              </div>
              <div className="h-48 flex items-end justify-between gap-2">
                {stats.incomeTrend.map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg transition-all hover:from-blue-600 hover:to-blue-400"
                         style={{ height: `${Math.max((item.amount / maxIncome) * 160, item.amount > 0 ? 8 : 0)}px` }}>
                    </div>
                    <span className="text-xs text-gray-500 mt-2">{item.date}</span>
                    <span className="text-xs text-gray-400">
                      {item.amount > 0 ? `¥${item.amount}` : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Players by Group */}
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">学员分组分布</h3>
                <PieChart className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                {stats.playersByGroup.map((item) => {
                  const percentage = stats.overview.totalPlayers > 0
                    ? (item._count / stats.overview.totalPlayers * 100).toFixed(1)
                    : 0
                  const colors: Record<string, string> = {
                    'U6': 'bg-yellow-400',
                    'U8': 'bg-orange-400',
                    'U10': 'bg-blue-400',
                    'U12': 'bg-green-400',
                    'U14': 'bg-purple-400',
                  }
                  return (
                    <div key={item.group} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${colors[item.group] || 'bg-gray-400'}`}></div>
                      <span className="text-sm text-gray-600 w-12">{item.group}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${colors[item.group] || 'bg-gray-400'}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-12 text-right">
                        {item._count}人
                      </span>
                      <span className="text-xs text-gray-400 w-12 text-right">
                        {percentage}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Course Sales */}
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">课程销售排行</h3>
              <Ticket className="w-5 h-5 text-gray-400" />
            </div>
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">排名</th>
                  <th className="pb-3 font-medium">课程名称</th>
                  <th className="pb-3 font-medium text-right">订单数</th>
                  <th className="pb-3 font-medium text-right">销售额</th>
                </tr>
              </thead>
              <tbody>
                {stats.courseSales.map((item, index) => (
                  <tr key={item.name} className="border-b last:border-0">
                    <td className="py-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-900">{item.name}</td>
                    <td className="py-3 text-sm text-gray-600 text-right">{item._count}</td>
                    <td className="py-3 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(item._sum.subtotal || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-gray-500">暂无数据</div>
        </div>
      )}
    </div>
  )
}