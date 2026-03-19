'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, MapPin, Users, Target, Play, CheckCircle2, Download, Edit, Sparkles } from 'lucide-react'

// 教案类型
type TrainingPlan = {
  id: string
  title: string
  group: string
  date: string
  duration: number
  location: string
  weather?: string
  theme?: string
  objective?: string
  intensity?: string
  status?: string
  generatedBy?: string
  sections?: any[]
  notes?: string
}

export default function PlanDetailPage({ params }: { params: { id: string } }) {
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlan()
  }, [params.id])

  async function fetchPlan() {
    try {
      setLoading(true)
      const response = await fetch(`/api/plans/${params.id}`)
      const data = await response.json()

      if (data.success) {
        const parsedPlan = {
          ...data.plan,
          sections: data.plan.sections ? JSON.parse(data.plan.sections) : []
        }
        setPlan(parsedPlan)
      }
    } catch (error) {
      console.error('获取教案详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">教案不存在</h2>
          <Link href="/plans" className="text-orange-600 hover:text-orange-700">返回教案库</Link>
        </div>
      </div>
    )
  }

  // 计算总时长和内容数量
  const totalTime = plan.duration
  const activityCount = plan.sections?.length || 0

  // 获取环节颜色
  const getSectionColor = (category: string) => {
    switch(category) {
      case 'warmup': return 'bg-blue-100 text-blue-700'
      case 'ball_familiarity': return 'bg-amber-100 text-amber-700'
      case 'technical': return 'bg-orange-100 text-orange-700'
      case 'physical': return 'bg-red-100 text-red-700'
      case 'tactical': return 'bg-purple-100 text-purple-700'
      case 'game': return 'bg-green-100 text-green-700'
      case 'cooldown': return 'bg-gray-100 text-gray-700'
      case 'etiquette': return 'bg-pink-100 text-pink-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getSectionLabel = (category: string) => {
    const labels: Record<string, string> = {
      warmup: '热身',
      ball_familiarity: '球性',
      technical: '技术',
      physical: '体能',
      tactical: '战术',
      game: '对抗',
      cooldown: '放松',
      etiquette: '礼仪'
    }
    return labels[category] || category
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/plans" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900">{plan.title}</h1>
                  {plan.generatedBy === 'ai' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                      <Sparkles className="w-3 h-3" />
                      AI生成
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>{plan.date}</span>
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">{plan.group}</span>
                  {plan.theme && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{plan.theme}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                <Edit className="w-4 h-4" />
                编辑
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" />
                导出
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg">
                <Play className="w-4 h-4" />
                开始训练
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 教案概览 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <div className="text-sm text-gray-500">训练时长</div>
                <div className="font-semibold text-gray-900">{plan.duration}分钟</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-sm text-gray-500">训练场地</div>
                <div className="font-semibold text-gray-900">{plan.location}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-sm text-gray-500">适合人数</div>
                <div className="font-semibold text-gray-900">8-12人</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-purple-500" />
              <div>
                <div className="text-sm text-gray-500">训练内容</div>
                <div className="font-semibold text-gray-900">{activityCount}项</div>
              </div>
            </div>
          </div>

          {/* 训练目标 */}
          {plan.objective && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">训练目标</h3>
              <p className="text-gray-600">{plan.objective}</p>
            </div>
          )}
        </div>

        {/* 训练内容 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">训练内容</h2>
          {plan.sections?.map((section, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getSectionColor(section.category)}`}>
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{section.name}</h3>
                    <span className="text-sm text-gray-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {section.duration}分钟
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getSectionColor(section.category)}`}>
                        {getSectionLabel(section.category)}
                      </span>
                    </span>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-gray-300" />
                </button>
              </div>

              <div className="ml-11 space-y-3">
                {section.activities?.map((activity: any, aIdx: number) => (
                  <div key={aIdx} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{activity.name}</span>
                      <span className="text-sm text-gray-500">{activity.duration}分钟</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{activity.description}</p>

                    {/* 教练引导语 */}
                    {activity.coachGuide && (
                      <div className="mt-2 p-2 bg-purple-50 border border-purple-100 rounded text-sm">
                        <div className="text-purple-700 font-medium mb-1">教练引导语</div>
                        <p className="text-gray-700">{activity.coachGuide}</p>
                      </div>
                    )}

                    {activity.keyPoints && activity.keyPoints.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {activity.keyPoints.map((point: string, pIdx: number) => (
                          <span key={pIdx} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {point}
                          </span>
                        ))}
                      </div>
                    )}

                    {activity.equipment && activity.equipment.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        器材：{activity.equipment.join('、')}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {section.points && section.points.length > 0 && (
                <div className="ml-11 mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700">
                    重点：{section.points.join(' · ')}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 注意事项 */}
        {plan.notes && (
          <div className="mt-6 bg-yellow-50 rounded-xl p-5 border border-yellow-200">
            <h3 className="font-semibold text-gray-900 mb-2">注意事项</h3>
            <p className="text-sm text-gray-700">{plan.notes}</p>
          </div>
        )}
      </main>
    </div>
  )
}
