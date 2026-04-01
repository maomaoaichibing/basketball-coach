'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Edit2,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Users,
  TrendingUp,
  Activity,
  Target,
  ChevronRight,
  Star,
  Clock
} from 'lucide-react'

// 类型定义
type Player = {
  id: string
  name: string
  gender: string
  birthDate: string
  age: number
  group: string
  status: string
  school?: string
  height?: number
  weight?: number
  position?: string
  parentName?: string
  parentPhone?: string
  parentWechat?: string
  enrollDate: string
  tags: string[]
  team?: { id: string; name: string }
  guardians: Guardian[]
  // 技术能力
  dribbling: number
  passing: number
  shooting: number
  defending: number
  physical: number
  tactical: number
  avgAbility: string
  // 统计
  totalTrainings: number
  attendanceRate: number
  presentCount: number
  absentCount: number
  lateCount: number
  // 关联
  records: TrainingRecord[]
  assessments: Assessment[]
  goals: Goal[]
}

type Guardian = {
  id: string
  name: string
  relation: string
  mobile: string
  wechat?: string
  email?: string
  isPrimary: boolean
}

type TrainingRecord = {
  id: string
  attendance: string
  performance?: number
  effort?: number
  attitude?: number
  feedback?: string
  highlights?: string
  recordedAt: string
  plan: {
    id: string
    title: string
    date: string
    theme?: string
  }
}

type Assessment = {
  id: string
  dribbling?: number
  passing?: number
  shooting?: number
  defending?: number
  physical?: number
  tactical?: number
  overall?: number
  notes?: string
  assessedAt: string
}

type Goal = {
  id: string
  skillType: string
  targetScore: number
  currentScore: number
  status: string
  targetDate?: string
}

const skillLabels: Record<string, string> = {
  dribbling: '运球',
  passing: '传球',
  shooting: '投篮',
  defending: '防守',
  physical: '体能',
  tactical: '战术'
}

const statusColors: Record<string, string> = {
  trial: 'bg-purple-100 text-purple-700',
  training: 'bg-green-100 text-green-700',
  vacation: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-gray-100 text-gray-700',
  graduated: 'bg-blue-100 text-blue-700'
}

const statusLabels: Record<string, string> = {
  trial: '试听',
  training: '在训',
  vacation: '请假',
  suspended: '停课',
  graduated: '结业'
}

const attendanceLabels: Record<string, { label: string; color: string }> = {
  present: { label: '出勤', color: 'text-green-600 bg-green-50' },
  absent: { label: '缺勤', color: 'text-red-600 bg-red-50' },
  late: { label: '迟到', color: 'text-yellow-600 bg-yellow-50' }
}

export default function PlayerDetailPage() {
  const params = useParams()
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'records' | 'assessments' | 'goals'>('records')
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchPlayer(params.id as string)
    }
  }, [params.id])

  async function fetchPlayer(id: string) {
    try {
      setLoading(true)
      const response = await fetch(`/api/players/${id}`)
      const data = await response.json()

      if (data.success) {
        setPlayer(data.player)
      }
    } catch (error) {
      console.error('获取学员详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAbilityColor = (score: number) => {
    if (score >= 8) return 'bg-green-500'
    if (score >= 6) return 'bg-blue-500'
    if (score >= 4) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">学员不存在</h3>
          <Link href="/players" className="text-orange-600 hover:text-orange-700">
            返回学员列表
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/players" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold text-orange-600">
                    {player.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{player.name}</h1>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[player.status]}`}>
                      {statusLabels[player.status]}
                    </span>
                    <span className="text-gray-500">{player.group}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">{player.age}岁</span>
                    {player.gender === 'male' ? '男' : '女'}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
            >
              <Edit2 className="w-4 h-4" />
              编辑
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 基本信息卡片 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* 综合评分 */}
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{player.avgAbility}</div>
              <div className="text-sm text-gray-500">综合评分</div>
            </div>

            {/* 出勤率 */}
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{player.attendanceRate}%</div>
              <div className="text-sm text-gray-500">出勤率</div>
            </div>

            {/* 训练次数 */}
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{player.totalTrainings}</div>
              <div className="text-sm text-gray-500">训练次数</div>
            </div>

            {/* 入训时间 */}
            <div className="text-center">
              <div className="text-lg font-bold text-gray-700">
                {new Date(player.enrollDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
              </div>
              <div className="text-sm text-gray-500">入训日期</div>
            </div>
          </div>
        </div>

        {/* 能力雷达 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            能力评估
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(['dribbling', 'passing', 'shooting', 'defending', 'physical', 'tactical'] as const).map(skill => {
              const score = player[skill]
              return (
                <div key={skill} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{skillLabels[skill]}</span>
                    <span className="font-semibold text-gray-900">{score}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getAbilityColor(score)}`}
                      style={{ width: `${score * 10}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 出勤统计 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-500" />
            出勤统计
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{player.presentCount}</div>
              <div className="text-sm text-green-700">出勤</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{player.absentCount}</div>
              <div className="text-sm text-red-700">缺勤</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{player.lateCount}</div>
              <div className="text-sm text-yellow-700">迟到</div>
            </div>
          </div>
        </div>

        {/* 标签页 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('records')}
                className={`flex-1 py-3 text-sm font-medium text-center ${
                  activeTab === 'records'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                训练记录 ({player.records.length})
              </button>
              <button
                onClick={() => setActiveTab('assessments')}
                className={`flex-1 py-3 text-sm font-medium text-center ${
                  activeTab === 'assessments'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                能力评估 ({player.assessments.length})
              </button>
              <button
                onClick={() => setActiveTab('goals')}
                className={`flex-1 py-3 text-sm font-medium text-center ${
                  activeTab === 'goals'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                阶段目标 ({player.goals.length})
              </button>
            </div>
          </div>

          <div className="p-4">
            {/* 训练记录列表 */}
            {activeTab === 'records' && (
              <div className="space-y-3">
                {player.records.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无训练记录
                  </div>
                ) : (
                  player.records.map(record => {
                    const attendance = attendanceLabels[record.attendance] || attendanceLabels.present
                    return (
                      <div key={record.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className={`px-2 py-1 text-xs rounded ${attendance.color}`}>
                          {attendance.label}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{record.plan.title}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(record.plan.date).toLocaleDateString('zh-CN')}
                            {record.plan.theme && ` · ${record.plan.theme}`}
                          </div>
                          {record.feedback && (
                            <div className="mt-2 text-sm text-gray-600 bg-white p-2 rounded">
                              {record.feedback}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          {record.performance && (
                            <div className="text-sm">
                              <span className="text-gray-500">表现</span>
                              <span className="ml-1 font-semibold text-orange-600">{record.performance}/10</span>
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(record.recordedAt).toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* 能力评估列表 */}
            {activeTab === 'assessments' && (
              <div className="space-y-3">
                {player.assessments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无评估记录
                  </div>
                ) : (
                  player.assessments.map(assessment => (
                    <div key={assessment.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-gray-500">
                          {new Date(assessment.assessedAt).toLocaleDateString('zh-CN')}
                        </div>
                        {assessment.overall && (
                          <div className="text-lg font-bold text-orange-600">
                            总评 {assessment.overall}/10
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(['dribbling', 'passing', 'shooting', 'defending', 'physical', 'tactical'] as const).map(skill => {
                          const score = assessment[skill]
                          if (!score) return null
                          return (
                            <div key={skill} className="flex items-center gap-2 text-sm">
                              <span className="text-gray-500">{skillLabels[skill]}</span>
                              <span className="font-semibold">{score}</span>
                            </div>
                          )
                        })}
                      </div>
                      {assessment.notes && (
                        <div className="mt-3 text-sm text-gray-600">{assessment.notes}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 阶段目标 */}
            {activeTab === 'goals' && (
              <div className="space-y-3">
                {player.goals.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无阶段目标
                  </div>
                ) : (
                  player.goals.map(goal => (
                    <div key={goal.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-orange-500" />
                          <span className="font-medium text-gray-900">
                            {skillLabels[goal.skillType] || goal.skillType}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          goal.status === 'achieved' ? 'bg-green-100 text-green-700' :
                          goal.status === 'active' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {goal.status === 'achieved' ? '已达成' : goal.status === 'active' ? '进行中' : '已放弃'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getAbilityColor(Math.min(goal.currentScore, 10))}`}
                              style={{ width: `${goal.currentScore * 10}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm">
                          <span className="font-semibold">{goal.currentScore}</span>
                          <span className="text-gray-400">/{goal.targetScore}</span>
                        </span>
                      </div>
                      {goal.targetDate && (
                        <div className="mt-2 text-xs text-gray-400">
                          目标日期: {new Date(goal.targetDate).toLocaleDateString('zh-CN')}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* 联系信息 */}
        {(player.guardians?.length > 0 || player.parentName) && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mt-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-orange-500" />
              联系信息
            </h2>
            <div className="space-y-3">
              {player.guardians?.map(guardian => (
                <div key={guardian.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-orange-600">
                      {guardian.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{guardian.name}</span>
                      <span className="text-sm text-gray-500">{guardian.relation}</span>
                      {guardian.isPrimary && (
                        <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-xs rounded">
                          主要
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {guardian.mobile}
                      {guardian.wechat && ` · ${guardian.wechat}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
