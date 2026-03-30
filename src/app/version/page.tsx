'use client'

import Link from 'next/link'
import { ArrowLeft, Github, Calendar, Tag, Zap, Plus, CheckCircle, AlertCircle, Info } from 'lucide-react'

// 版本历史记录
const versions = [
  {
    version: 'v4.2',
    date: '2026-03-30',
    title: 'AI 教案生成优化 + 智能分析',
    description: '重构教案生成逻辑，增加智能分析和版本管理',
    features: [
      { type: 'feature', text: '三段式教案结构（每30分钟一节）' },
      { type: 'feature', text: 'U10 基础/进阶/精英 三级版本' },
      { type: 'feature', text: '去掉教练引导语，只保留动作描述' },
      { type: 'feature', text: '教案头部显示技能水平 + 训练强度双标签' },
      { type: 'feature', text: '批量导入学员（CSV表格）' },
      { type: 'feature', text: '左上角显示当前版本号' },
      { type: 'feature', text: '右上角增加版本管理入口' },
    ],
    fixes: [
      { type: 'fix', text: '修复教练API缺少password字段的TypeScript错误' },
    ]
  },
  {
    version: 'v4.1',
    date: '2026-03-24',
    title: '智能教案生成 2.0',
    description: 'AI 驱动的智能教案生成系统，支持技能短板分析',
    features: [
      { type: 'feature', text: 'RAG 案例库集成，检索相似教学案例' },
      { type: 'feature', text: '学员技能短板自动分析' },
      { type: 'feature', text: '针对性训练方案推荐' },
      { type: 'feature', text: '支持 AI 生成和规则生成双模式' },
    ],
    fixes: [
      { type: 'fix', text: '修复分数计算 bug（从5分制改为50分制）' },
      { type: 'fix', text: '优化技能等级阈值，适应不同年龄段' },
    ]
  },
  {
    version: 'v4.0',
    date: '2026-03-20',
    title: '全面重构升级',
    description: 'Next.js + TypeScript + Tailwind CSS 技术栈重构',
    features: [
      { type: 'feature', text: '全新 UI 设计，响应式布局' },
      { type: 'feature', text: '完整的学员管理系统' },
      { type: 'feature', text: '训练计划管理' },
      { type: 'feature', text: '课后反馈与评估' },
      { type: 'feature', text: '数据统计与分析' },
    ],
    fixes: [
      { type: 'fix', text: '修复开发模式样式丢失问题' },
      { type: 'fix', text: '优化生产环境构建流程' },
    ]
  },
]

export default function VersionPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Tag className="w-5 h-5 text-gray-600" />
              版本管理
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 当前版本 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">当前版本</h2>
                <p className="text-gray-500 text-sm">查看最新功能和改进</p>
              </div>
            </div>
            <div className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg font-bold text-lg">
              {versions[0].version}
            </div>
          </div>
          <div className="prose max-w-none">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{versions[0].title}</h3>
            <p className="text-gray-600">{versions[0].description}</p>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {versions[0].date}
            </div>
            <div className="flex items-center gap-1">
              <Github className="w-4 h-4" />
              <a href="https://github.com/maomaoaichibing/basketball-coach" target="_blank" className="hover:text-gray-700">
                查看源码
              </a>
            </div>
          </div>
        </div>

        {/* 版本历史 */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            版本历史
          </h2>

          {versions.map((version, idx) => (
            <div key={idx} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-bold">
                    {version.version}
                  </div>
                  <div className="text-sm text-gray-500">{version.date}</div>
                </div>
                {idx === 0 && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                    最新
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{version.title}</h3>
              <p className="text-gray-600 mb-4">{version.description}</p>

              {/* 新功能 */}
              {version.features && version.features.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Plus className="w-4 h-4 text-green-600" />
                    新功能
                  </h4>
                  <ul className="space-y-1">
                    {version.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feat.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 修复 */}
              {version.fixes && version.fixes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    修复与优化
                  </h4>
                  <ul className="space-y-1">
                    {version.fixes.map((fix, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2 text-sm text-gray-600">
                        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span>{fix.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">版本更新说明</p>
              <p>系统会持续迭代优化，每个版本都会带来新的功能和改进。建议定期查看版本更新日志，了解最新功能。</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}