'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Star, Award, Target, Calendar, Users } from 'lucide-react'

// 模拟球员数据
const mockPlayers = [
  { 
    id: '1', 
    name: '张三', 
    group: 'U10', 
    avatar: '张',
    trend: { dribbling: 1, passing: 0, shooting: 2, defending: 1, physical: 0, tactical: -1 },
    lastAssessment: '2026-03-10',
    goals: 3,
    goalsAchieved: 2
  },
  { 
    id: '2', 
    name: '李四', 
    group: 'U10', 
    avatar: '李',
    trend: { dribbling: 2, passing: 1, shooting: 1, defending: 1, physical: 1, tactical: 1 },
    lastAssessment: '2026-03-12',
    goals: 2,
    goalsAchieved: 2
  },
  { 
    id: '3', 
    name: '王五', 
    group: 'U10', 
    avatar: '王',
    trend: { dribbling: 0, passing: 1, shooting: 0, defending: 2, physical: 3, tactical: 0 },
    lastAssessment: '2026-03-08',
    goals: 4,
    goalsAchieved: 1
  },
  { 
    id: '4', 
    name: '赵六', 
    group: 'U8', 
    avatar: '赵',
    trend: { dribbling: 3, passing: 2, shooting: 2, defending: 1, physical: 1, tactical: 0 },
    lastAssessment: '2026-03-15',
    goals: 1,
    goalsAchieved: 1
  },
]

// 模拟球队整体趋势
const mockTeamTrend = [
  { month: '10月', avgScore: 5.2, attendance: 85 },
  { month: '11月', avgScore: 5.5, attendance: 88 },
  { month: '12月', avgScore: 5.8, attendance: 82 },
  { month: '01月', avgScore: 6.1, attendance: 90 },
  { month: '02月', avgScore: 6.4, attendance: 87 },
  { month: '03月', avgScore: 6.8, attendance: 92 },
]

export default function GrowthPage() {
  const [selectedPlayer, setSelectedPlayer] = useState<typeof mockPlayers[0] | null>(null)

  const labels: Record<string, string> = {
    dribbling: '运球', passing: '传球', shooting: '投篮',
    defending: '防守', physical: '体能', tactical: '战术'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">成长追踪</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 球队整体趋势 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">球队整体趋势</h2>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 能力趋势图 */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">平均能力分趋势</h3>
                <div className="flex items-end gap-2 h-32">
                  {mockTeamTrend.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-orange-500 rounded-t transition-all"
                        style={{ height: `${d.avgScore * 15}%` }}
                      />
                      <span className="text-xs text-gray-400 mt-1">{d.month}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-center">
                  <span className="text-2xl font-bold text-green-600">+31%</span>
                  <span className="text-sm text-gray-500"> 较半年前</span>
                </div>
              </div>

              {/* 出勤率趋势 */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">训练出勤率</h3>
                <div className="flex items-end gap-2 h-32">
                  {mockTeamTrend.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 rounded-t transition-all"
                        style={{ height: `${d.attendance}%` }}
                      />
                      <span className="text-xs text-gray-400 mt-1">{d.month}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-center">
                  <span className="text-2xl font-bold text-blue-600">92%</span>
                  <span className="text-sm text-gray-500"> 本月出勤</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 球员成长列表 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">球员成长</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockPlayers.map(player => (
              <div 
                key={player.id} 
                onClick={() => setSelectedPlayer(player)}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
              >
                {/* 球员头像和名字 */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-orange-600">{player.avatar}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{player.name}</h3>
                    <p className="text-sm text-gray-500">{player.group}</p>
                  </div>
                </div>

                {/* 目标进度 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-500">目标完成</span>
                    <span className="font-medium">{player.goalsAchieved}/{player.goals}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${(player.goalsAchieved / player.goals) * 100}%` }}
                    />
                  </div>
                </div>

                {/* 近期趋势 */}
                <div className="space-y-1">
                  {Object.entries(player.trend).map(([skill, change]) => (
                    <div key={skill} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{labels[skill]}</span>
                      <span className={`flex items-center gap-1 ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {change > 0 ? <TrendingUp className="w-3 h-3" /> : change < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                        {change > 0 ? '+' : ''}{change}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  上次评估: {player.lastAssessment}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 球员详情弹窗 */}
        {selectedPlayer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPlayer(null)}>
            <div className="bg-white rounded-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-orange-600">{selectedPlayer.avatar}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedPlayer.name}</h3>
                    <p className="text-gray-500">{selectedPlayer.group} · 上次评估 {selectedPlayer.lastAssessment}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedPlayer(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              {/* 能力变化详情 */}
              <div className="space-y-3 mb-6">
                <h4 className="font-semibold text-gray-900">近30天能力变化</h4>
                {Object.entries(selectedPlayer.trend).map(([skill, change]) => (
                  <div key={skill} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{labels[skill]}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {change > 0 ? '+' : ''}{change}
                      </span>
                      {change > 0 ? (
                        <Award className="w-5 h-5 text-green-600" />
                      ) : change < 0 ? (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {/* 目标列表 */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">当前目标</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-green-600" />
                      <span>投篮准确率达到7分</span>
                    </div>
                    <span className="text-green-600 font-medium">进行中</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-gray-600" />
                      <span>掌握跨下运球</span>
                    </div>
                    <span className="text-gray-500">已完成</span>
                  </div>
                </div>
              </div>

              <button className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg">
                查看完整成长档案
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
