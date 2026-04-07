'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/auth';
import {
  ArrowLeft,
  Sparkles,
  Users,
  Target,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Zap,
} from 'lucide-react';

type SkillScore = {
  skill: string;
  label: string;
  avgScore: number;
  playerCount: number;
};

type PlayerInsight = {
  id: string;
  name: string;
  group: string;
  weakestSkill: string;
  strongestSkill: string;
  attendanceRate: number;
  totalTrainings: number;
  suggestion: string;
};

type SmartPlanData = {
  skillAnalysis: {
    scores: SkillScore[];
    weakestSkills: SkillScore[];
    recommendation: string;
  };
  planParams: {
    group: string;
    duration: number;
    location: string;
    theme: string;
    focusSkills: string[];
    playerCount: number;
    skillLevel: string;
    previousTraining: string[];
  };
  reasons: string[];
  playerInsights: PlayerInsight[];
  suggestedActivities: string[];
};

const skillLabels: Record<string, string> = {
  dribbling: '运球',
  passing: '传球',
  shooting: '投篮',
  defending: '防守',
  physical: '体能',
  tactical: '战术',
};

const skillColors: Record<string, string> = {
  dribbling: 'bg-blue-500',
  passing: 'bg-green-500',
  shooting: 'bg-orange-500',
  defending: 'bg-purple-500',
  physical: 'bg-red-500',
  tactical: 'bg-indigo-500',
};

export default function SmartPlanPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('U10');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<SmartPlanData | null>(null);
  const [step, setStep] = useState<'select' | 'analysis' | 'generating'>('select');

  useEffect(() => {
    setGroups(['U6', 'U8', 'U10', 'U12', 'U14']);
  }, []);

  async function analyze() {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/smart-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group: selectedGroup,
          duration: 90,
          location: '室内',
        }),
      });

      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setStep('analysis');
      } else {
        alert(result.message || '分析失败');
      }
    } catch {
      alert('请求失败');
    } finally {
      setLoading(false);
    }
  }

  async function generatePlan() {
    if (!data) return;
    setGenerating(true);
    setStep('generating');

    try {
      // 跳转到教案生成页面，携带智能推荐参数
      const params = new URLSearchParams({
        group: data.planParams.group,
        duration: String(data.planParams.duration),
        location: data.planParams.location,
        theme: data.planParams.theme,
        focusSkills: data.planParams.focusSkills.join(','),
        skillLevel: data.planParams.skillLevel,
        smart: 'true',
      });

      router.push(`/plan/new?${params.toString()}`);
    } catch {
      setGenerating(false);
      setStep('analysis');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-violet-500 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                智能教案 2.0
              </h1>
              <p className="text-violet-200 text-sm">根据学员技能短板自动生成针对性教案</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 步骤1: 选择班级 */}
        {step === 'select' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-4">选择训练班级</h2>
              <div className="grid grid-cols-5 gap-3">
                {groups.map((group) => (
                  <button
                    key={group}
                    onClick={() => setSelectedGroup(group)}
                    className={`p-4 rounded-xl text-center transition-all ${
                      selectedGroup === group
                        ? 'bg-orange-500 text-white shadow-lg'
                        : 'bg-gray-50 border border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div
                      className={`font-bold text-lg ${selectedGroup === group ? 'text-white' : 'text-gray-900'}`}
                    >
                      {group}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={analyze}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  正在分析学员数据...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  开始智能分析
                </>
              )}
            </button>

            {/* 说明 */}
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
              <h3 className="font-medium text-gray-700 mb-2">智能教案会分析：</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  全班学员技能短板（运球/传球/投篮/防守/体能/战术）
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  个人能力对比与训练建议
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  最近训练主题，自动避免重复
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  结合 RAG 案例库生成专业教案
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* 步骤2: 分析结果 */}
        {step === 'analysis' && data && (
          <div className="space-y-6">
            {/* 班级技能分析 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" />
                班级能力分析（{data.planParams.group}）
              </h2>

              {/* 技能条 */}
              <div className="space-y-3 mb-6">
                {data.skillAnalysis.scores.map((skill) => (
                  <div key={skill.skill} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{skill.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{skill.avgScore}</span>
                        {skill.avgScore < 6 && <AlertTriangle className="w-3 h-3 text-red-500" />}
                      </div>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${skillColors[skill.skill] || 'bg-gray-400'} ${skill.avgScore < 6 ? 'opacity-70' : ''}`}
                        style={{ width: `${skill.avgScore * 10}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 推荐理由 */}
              <div className="p-3 bg-violet-50 rounded-lg">
                <div className="text-sm font-medium text-violet-700 mb-1">推荐训练方向</div>
                <p className="text-sm text-violet-600">{data.skillAnalysis.recommendation}</p>
                <ul className="mt-2 space-y-1">
                  {data.reasons.map((reason, i) => (
                    <li key={i} className="text-xs text-violet-500 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 推荐活动 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-4">推荐训练活动</h2>
              <div className="grid grid-cols-2 gap-3">
                {data.suggestedActivities.map((activity, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <span className="text-lg">{['🏀', '🎯', '🏃', '💪'][i % 4]}</span>
                    <span className="text-sm text-gray-700">{activity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 学员个人分析 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  学员分析（{data.playerInsights.length}人）
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {data.playerInsights.map((insight) => (
                  <div key={insight.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {insight.name}
                          <span className="text-xs text-gray-400 ml-2">{insight.group}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="text-red-500">短板: {insight.weakestSkill}</span>
                          <span className="mx-2">|</span>
                          <span className="text-green-500">强项: {insight.strongestSkill}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">{insight.suggestion}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-sm font-semibold">{insight.attendanceRate}%</div>
                        <div className="text-xs text-gray-400">出勤率</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('select')}
                className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
              >
                重新选择
              </button>
              <button
                onClick={generatePlan}
                disabled={generating}
                className="flex-[2] py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    正在生成教案...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    生成智能教案 - {data.planParams.theme}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
