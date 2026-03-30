'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Save, Calendar, Clock, MapPin, Sun, Cloud, CloudRain, Snowflake, Sparkles } from 'lucide-react'
import { generateTrainingPlan, type AgeGroup, type Location, type TrainingPlanOutput } from '@/lib/plan-generator'

export default function NewPlanPage() {
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState<TrainingPlanOutput | null>(null)
  const [useAI, setUseAI] = useState(false) // 是否使用AI生成

  // 表单状态
  const [form, setForm] = useState({
    group: 'U10' as AgeGroup,
    duration: 90,
    location: '室内' as Location,
    weather: '',
    theme: ''
  })

  // AI特有配置
  const [aiConfig, setAiConfig] = useState({
    additionalNotes: '',
    playerCount: '',
    skillLevel: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    previousTraining: ''
  })

  const [focusSkills, setFocusSkills] = useState<string[]>([])

  const groups: { id: AgeGroup; name: string; age: string; desc: string }[] = [
    { id: 'U6', name: 'U6 幼儿班', age: '4-6岁', desc: '游戏为主 球性培养' },
    { id: 'U8', name: 'U8 小学低年级', age: '7-8岁', desc: '基础运球 传球入门' },
    { id: 'U10', name: 'U10 小学中年级', age: '9-10岁', desc: '技术规范 体能加入' },
    { id: 'U12', name: 'U12 小学高年级', age: '11-12岁', desc: '战术训练 对抗加强' },
    { id: 'U14', name: 'U14 初中', age: '13-14岁', desc: '综合提升 中考体育' },
  ]

  const durations = [60, 90, 120]
  const locations: Location[] = ['室内', '室外']
  const weathers = ['', '晴天', '阴天', '雨天', '雪天']
  const themes = ['', '运球基础', '传球技术', '投篮训练', '防守入门', '进攻战术', '防守战术', '体能训练', '综合训练', '对抗比赛', '考核评估', '球性熟悉', '中考体育']
  const skillOptions = ['运球', '传球', '投篮', '防守', '体能', '战术']

  // 生成教案
  async function handleGenerate() {
    // AI模式下验证人数
    if (useAI && !aiConfig.playerCount) {
      alert('请填写学员人数，AI将据此调整训练分组和强度')
      return
    }

    setGenerating(true)

    try {
      let result: TrainingPlanOutput

      if (useAI) {
        // AI生成（通过服务端API代理）
        const aiParams = {
          group: form.group,
          duration: form.duration,
          location: form.location,
          weather: form.weather || undefined,
          theme: form.theme || undefined,
          focusSkills,
          additionalNotes: aiConfig.additionalNotes || undefined,
          playerCount: aiConfig.playerCount ? parseInt(aiConfig.playerCount) : undefined,
          skillLevel: aiConfig.skillLevel,
          previousTraining: aiConfig.previousTraining ? aiConfig.previousTraining.split(/[,，]/).map(s => s.trim()) : undefined
        }

        // 调用服务端API生成教案
        const response = await fetch('/api/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(aiParams)
        })
        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'AI生成失败')
        }
        result = data.plan
      } else {
        // 规则引擎生成
        await new Promise(resolve => setTimeout(resolve, 800))
        result = generateTrainingPlan({
          group: form.group,
          duration: form.duration,
          location: form.location,
          weather: form.weather || undefined,
          theme: form.theme || undefined,
          focusSkills
        })
      }

      setPlan(result)
    } catch (error) {
      console.error('生成教案失败:', error)
      alert('生成教案失败，请重试')
    } finally {
      setGenerating(false)
    }
  }

  // 保存教案
  async function handleSave() {
    if (!plan) return

    setSaving(true)

    try {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...plan,
          generatedBy: useAI ? 'ai' : 'rule'
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('教案保存成功！')
        // 跳转到教案详情页
        window.location.href = `/plans/${data.id}`
      } else {
        alert('保存失败：' + data.error)
      }
    } catch (error) {
      console.error('保存教案失败:', error)
      alert('保存教案失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  // 技能选择切换
  function toggleSkill(skill: string) {
    setFocusSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    )
  }

  // 获取天气图标
  const getWeatherIcon = (w: string) => {
    switch(w) {
      case '晴天': return <Sun className="w-5 h-5 text-yellow-500" />
      case '阴天': return <Cloud className="w-5 h-5 text-gray-500" />
      case '雨天': return <CloudRain className="w-5 h-5 text-blue-500" />
      case '雪天': return <Snowflake className="w-5 h-5 text-blue-300" />
      default: return null
    }
  }

  // 获取环节颜色
  const getSectionColor = (category: string) => {
    switch(category) {
      case 'warmup': return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'ball_familiarity': return 'bg-amber-100 border-amber-300 text-amber-800'
      case 'technical': return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'physical': return 'bg-orange-100 border-orange-300 text-orange-800'
      case 'tactical': return 'bg-purple-100 border-purple-300 text-purple-800'
      case 'game': return 'bg-red-100 border-red-300 text-red-800'
      case 'cooldown': return 'bg-green-100 border-green-300 text-green-800'
      case 'etiquette': return 'bg-pink-100 border-pink-300 text-pink-800'
      default: return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  // 获取环节名称
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
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">生成新教案</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：配置表单 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">训练配置</h2>
                {/* 生成模式切换 */}
                <button
                  onClick={() => setUseAI(!useAI)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    useAI
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {useAI ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      AI生成
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      规则生成
                    </>
                  )}
                </button>
              </div>
              
              {/* 年龄段 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">年龄段</label>
                <div className="grid grid-cols-1 gap-2">
                  {groups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setForm({...form, group: g.id})}
                      className={`p-2 rounded-lg text-center transition-all ${
                        form.group === g.id
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="font-bold text-left">{g.name}</div>
                      <div className="text-xs text-left opacity-80">{g.age} · {g.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 时长 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">训练时长</label>
                <div className="flex gap-2">
                  {durations.map(d => (
                    <button
                      key={d}
                      onClick={() => setForm({...form, duration: d})}
                      className={`flex-1 p-2 rounded-lg text-center transition-all flex items-center justify-center gap-1 ${
                        form.duration === d
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      {d}分钟
                    </button>
                  ))}
                </div>
              </div>

              {/* 场地 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">训练场地</label>
                <div className="flex gap-2">
                  {locations.map(l => (
                    <button
                      key={l}
                      onClick={() => setForm({...form, location: l})}
                      className={`flex-1 p-2 rounded-lg text-center transition-all flex items-center justify-center gap-1 ${
                        form.location === l
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* 天气 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">天气（可选）</label>
                <select
                  value={form.weather}
                  onChange={e => setForm({...form, weather: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="">请选择</option>
                  {weathers.filter(w => w).map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              {/* 主题 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">训练主题（可选）</label>
                <select
                  value={form.theme}
                  onChange={e => setForm({...form, theme: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="">随机选择</option>
                  {themes.filter(t => t).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* 重点技能 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">重点训练技能</label>
                <div className="flex flex-wrap gap-2">
                  {skillOptions.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSkill(s)}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        focusSkills.includes(s)
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

                  {/* AI专属配置 */}
                  {useAI && (
                    <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-3 text-purple-700">
                        <Sparkles className="w-4 h-4" />
                        <span className="font-medium text-sm">AI生成配置</span>
                      </div>

                  {/* 学员人数 */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      学员人数 <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      placeholder="请填写"
                      value={aiConfig.playerCount}
                      onChange={e => setAiConfig({...aiConfig, playerCount: e.target.value})}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        !aiConfig.playerCount 
                          ? 'border-orange-300 bg-orange-50' 
                          : 'border-gray-300'
                      }`}
                    />
                    {!aiConfig.playerCount ? (
                      <p className="mt-1 text-xs text-orange-600">请填写学员人数，AI将据此调整训练分组和强度</p>
                    ) : (
                      <p className="mt-1 text-xs text-green-600">已设置 {aiConfig.playerCount} 名学员</p>
                    )}
                  </div>

                  {/* 技能水平 */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">学员技能水平</label>
                    <select
                      value={aiConfig.skillLevel}
                      onChange={e => setAiConfig({...aiConfig, skillLevel: e.target.value as any})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    >
                      <option value="beginner">初级</option>
                      <option value="intermediate">中级</option>
                      <option value="advanced">高级</option>
                    </select>
                  </div>

                  {/* 最近训练 */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">最近训练内容（避免重复）</label>
                    <input
                      type="text"
                      placeholder="如：运球, 传球"
                      value={aiConfig.previousTraining}
                      onChange={e => setAiConfig({...aiConfig, previousTraining: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>

                  {/* 其他要求 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">其他要求</label>
                    <textarea
                      placeholder="如：重点培养团队协作，增加趣味性..."
                      value={aiConfig.additionalNotes}
                      onChange={e => setAiConfig({...aiConfig, additionalNotes: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none"
                    />
                  </div>
                </div>
              )}

              {/* 生成按钮 */}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className={`w-full py-3 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                  useAI
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                {generating ? (
                  <>生成中...</>
                ) : useAI ? (
                  <>
                    <Sparkles className="w-5 h-5" />
                    AI生成教案
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    生成教案
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 右侧：教案预览 */}
          <div className="lg:col-span-2">
            {plan ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* 教案头部 */}
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">{plan.title}</h2>
                      <p className="text-orange-100">
                        {plan.date} · {plan.duration}分钟 · {plan.location}
                        {plan.weather && ` · ${plan.weather}`}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {/* 技能水平标签（只要选了技能水平就显示，无论AI还是规则） */}
                      {aiConfig.skillLevel && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          aiConfig.skillLevel === 'advanced' ? 'bg-red-500' :
                          aiConfig.skillLevel === 'intermediate' ? 'bg-yellow-500' : 'bg-green-500'
                        } text-white`}>
                          {aiConfig.skillLevel === 'advanced' ? '高级水平' : 
                           aiConfig.skillLevel === 'intermediate' ? '中级水平' : '初级水平'}
                        </span>
                      )}
                      {/* 训练强度标签 */}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        plan.intensity === 'high' ? 'bg-red-600' :
                        plan.intensity === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                      } text-white`}>
                        {plan.intensity === 'high' ? '高强度' : 
                         plan.intensity === 'medium' ? '中等强度' : '低强度'}
                      </span>
                    </div>
                  </div>
                  
                  {/* 重点技能标签 */}
                  <div className="flex flex-wrap gap-2">
                    {(plan.focusSkills || []).map(skill => (
                      <span key={skill} className="px-2 py-1 bg-white/20 rounded text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 训练内容 */}
                <div className="p-6 space-y-4">
                  {plan.sections.map((section, idx) => (
                    <div 
                      key={idx} 
                      className={`rounded-lg border-2 p-4 ${getSectionColor(section.category)}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-lg">{section.name}</h3>
                        <span className="text-sm font-medium bg-white/50 px-2 py-1 rounded">
                          {section.duration}分钟
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        {section.activities.map((activity, aIdx) => (
                          <div key={aIdx} className="bg-white/60 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{activity.name}</span>
                              <span className="text-sm text-gray-500">{activity.duration}分钟</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                            {activity.coachGuide && (
                              <div className="mt-2 p-2 bg-purple-50 border border-purple-100 rounded text-sm">
                                <div className="text-purple-700 font-medium mb-1">教练引导语</div>
                                <p className="text-gray-700">{activity.coachGuide}</p>
                              </div>
                            )}
                            {activity.keyPoints && activity.keyPoints.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {activity.keyPoints.map((point, pIdx) => (
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
                        <div className="mt-3 pt-3 border-t border-black/10">
                          <p className="text-sm font-medium">
                            重点：{section.points.join(' · ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 备注 */}
                {plan.notes && (
                  <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-2">注意事项</h3>
                    <p className="text-sm text-gray-600">{plan.notes}</p>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="p-6 border-t border-gray-100 flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>保存中...</>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        保存教案
                      </>
                    )}
                  </button>
                  <button className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors">
                    导出PDF
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">等待生成教案</h3>
                <p className="text-gray-500 mb-4">请在左侧配置训练参数<br/>然后点击"生成教案"</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
