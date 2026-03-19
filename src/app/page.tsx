'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ClipboardList,
  Users,
  Target,
  TrendingUp,
  Calendar,
  Settings,
  Plus,
  ChevronRight,
  Dumbbell,
  Trophy,
  Sparkles
} from 'lucide-react'

// 教案类型
type TrainingPlan = {
  id: string
  title: string
  date: string
  duration: number
  group: string
  location: string
  weather?: string
  theme?: string
  focusSkills?: string[]
  intensity?: string
  status?: string
  generatedBy?: string
  sections?: any[]
}

export default function Home() {
  const [selectedGroup, setSelectedGroup] = useState('U10')
  const [recentPlans, setRecentPlans] = useState<TrainingPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)

  useEffect(() => {
    fetchRecentPlans()
  }, [])

  async function fetchRecentPlans() {
    try {
      setLoadingPlans(true)
      const response = await fetch('/api/plans?limit=6')
      const data = await response.json()

      if (data.success) {
        const parsedPlans = data.plans.map((plan: any) => ({
          ...plan,
          focusSkills: plan.focusSkills ? JSON.parse(plan.focusSkills) : [],
          sections: plan.sections ? JSON.parse(plan.sections) : []
        }))
        setRecentPlans(parsedPlans)
      }
    } catch (error) {
      console.error('获取最近教案失败:', error)
    } finally {
      setLoadingPlans(false)
    }
  }

  const groups = [
    { id: 'U6', name: 'U6', age: '4-6岁', desc: '启蒙阶段' },
    { id: 'U8', name: 'U8', age: '7-8岁', desc: '基础阶段' },
    { id: 'U10', name: 'U10', age: '9-10岁', desc: '发展阶段' },
    { id: 'U12', name: 'U12', age: '11-12岁', desc: '提高阶段' },
    { id: 'U14', name: 'U14', age: '13-14岁', desc: '青少年阶段' },
  ]

  return (
    <div className="min-h-screen">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Dumbbell className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold">篮球青训教案系统</h1>
                <p className="text-orange-100 text-sm">智能教案生成 · 球员成长追踪</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/settings" className="p-2 hover:bg-white/10 rounded-lg">
                <Settings className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 快速操作 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/plan/new" className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                <Plus className="w-6 h-6 text-orange-600 group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">生成新教案</h3>
                <p className="text-sm text-gray-500">AI 智能生成训练教案</p>
              </div>
            </div>
          </Link>

          <Link href="/players" className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                <Users className="w-6 h-6 text-blue-600 group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">球员管理</h3>
                <p className="text-sm text-gray-500">查看和评估球员</p>
              </div>
            </div>
          </Link>

          <Link href="/plans" className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-500 transition-colors">
                <ClipboardList className="w-6 h-6 text-green-600 group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">教案库</h3>
                <p className="text-sm text-gray-500">历史教案管理</p>
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
                <div className={`font-bold text-lg ${selectedGroup === group.id ? 'text-white' : 'text-gray-900'}`}>
                  {group.name}
                </div>
                <div className={`text-sm ${selectedGroup === group.id ? 'text-orange-100' : 'text-gray-500'}`}>
                  {group.age}
                </div>
                <div className={`text-xs mt-1 ${selectedGroup === group.id ? 'text-orange-200' : 'text-gray-400'}`}>
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
            <Link href="/plans" className="text-orange-600 hover:text-orange-700 text-sm flex items-center gap-1">
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
                        {new Date(plan.date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {plan.generatedBy === 'ai' && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          AI
                        </span>
                      )}
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">{plan.group}</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {plan.title}
                  </h3>
                  {plan.theme && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-1">
                      {plan.theme}
                    </p>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/growth" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center">
              <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">成长追踪</span>
            </Link>
            <Link href="/assessment" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center">
              <Trophy className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">球员评估</span>
            </Link>
            <Link href="/teams" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">球队管理</span>
            </Link>
            <Link href="/library" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center">
              <ClipboardList className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-700">训练库</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
