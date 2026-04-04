'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  ChevronRight,
  Calendar,
  User,
  Star,
  TrendingUp,
  Trophy,
  Download,
  ArrowLeft,
  Edit3,
  Save,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

type GrowthReport = {
  id: string;
  playerId: string;
  playerName: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  reportType: string;
  abilities: AbilityDimensions;
  trainingStats: TrainingStats;
  matchStats: MatchStats;
  strengths: string[];
  improvements: string[];
  goals: string[];
  overallRating: number;
  summary: string;
  coachName: string;
  status: string;
  createdAt: string;
  publishedAt: string;
};

type AbilityDimensions = {
  dribbling: number;
  passing: number;
  shooting: number;
  defending: number;
  physical: number;
  tactical: number;
};

type TrainingStats = {
  totalSessions?: number;
  attendanceRate?: number;
  avgPerformance?: number;
  totalHours?: number;
  skillImprovements?: string[];
};

type MatchStats = {
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  avgScore: string;
  winRate?: number;
};

export default function GrowthReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [report, setReport] = useState<GrowthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [reportId, setReportId] = useState<string>('');

  const [editForm, setEditForm] = useState({
    summary: '',
    strengths: [] as string[],
    improvements: [] as string[],
    goals: [] as string[],
    overallRating: 0,
  });

  useEffect(() => {
    params.then(p => {
      setReportId(p.id);
      fetchReport(p.id);
    });
  }, [params]);

  async function fetchReport(id: string) {
    try {
      setLoading(true);
      const response = await fetch(`/api/growth-reports/${id}`);
      const data = await response.json();

      if (data.success) {
        setReport(data.report);
        setEditForm({
          summary: data.report.summary || '',
          strengths: data.report.strengths || [],
          improvements: data.report.improvements || [],
          goals: data.report.goals || [],
          overallRating: data.report.overallRating || 0,
        });
      }
    } catch (error) {
      console.error('获取报告详情失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!report) return;

    try {
      const response = await fetch(`/api/growth-reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: editForm.summary,
          strengths: editForm.strengths,
          improvements: editForm.improvements,
          goals: editForm.goals,
          overallRating: editForm.overallRating,
          status: 'published',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsEditing(false);
        fetchReport(reportId);
      }
    } catch (error) {
      console.error('保存失败:', error);
    }
  }

  async function handleDelete() {
    if (!report || !confirm('确定要删除这份报告吗？')) return;

    try {
      const response = await fetch(`/api/growth-reports/${report.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        router.push('/growth-reports');
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  }

  function handleExport() {
    // 简单的打印功能，可以导出PDF
    window.print();
  }

  const abilityLabels: Record<string, string> = {
    dribbling: '运球',
    passing: '传球',
    shooting: '投篮',
    defending: '防守',
    physical: '体能',
    tactical: '战术',
  };

  const abilityColors = [
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600',
    'from-orange-500 to-orange-600',
    'from-red-500 to-red-600',
    'from-purple-500 to-purple-600',
    'from-yellow-500 to-yellow-600',
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">报告不存在</h2>
          <Link href="/growth-reports" className="text-orange-600 hover:text-orange-700">
            返回报告列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/growth-reports" className="text-gray-400 hover:text-gray-600">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-xs rounded ${
                      report.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : report.status === 'viewed'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {report.status === 'published'
                      ? '已发布'
                      : report.status === 'viewed'
                        ? '已查看'
                        : '草稿'}
                  </span>
                </div>
                <h1 className="text-lg font-bold text-gray-900 mt-1">{report.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                  >
                    <Save className="w-4 h-4" />
                    保存
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors text-sm"
                  >
                    <Edit3 className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 报告头部 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-2">{report.title}</h2>
                <div className="flex items-center gap-4 text-sm text-orange-100">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {report.playerName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(report.periodStart).toLocaleDateString('zh-CN')} -{' '}
                    {new Date(report.periodEnd).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
              {report.overallRating && (
                <div className="text-center">
                  <div className="text-5xl font-bold">{report.overallRating}</div>
                  <div className="text-sm text-orange-100">综合评分</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 能力雷达图 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              能力评估
            </h3>
            <div className="space-y-4">
              {report.abilities &&
                Object.entries(report.abilities).map(([key, value]: [string, any], index) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {abilityLabels[key] || key}
                      </span>
                      <span className="text-sm font-bold text-gray-900">{value}/10</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${abilityColors[index % abilityColors.length]} rounded-full transition-all`}
                        style={{ width: `${value * 10}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* 训练统计 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-green-500" />
              训练数据
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {report.trainingStats?.totalSessions || 0}
                </div>
                <div className="text-sm text-gray-500">训练次数</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {report.trainingStats?.attendanceRate || 0}%
                </div>
                <div className="text-sm text-gray-500">出勤率</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {report.trainingStats?.avgPerformance || 0}
                </div>
                <div className="text-sm text-gray-500">平均表现</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {report.trainingStats?.totalHours || 0}
                </div>
                <div className="text-sm text-gray-500">训练时长(h)</div>
              </div>
            </div>

            {/* 比赛数据 */}
            {report.matchStats && report.matchStats.totalMatches > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-3">比赛数据</h4>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <div className="font-bold text-gray-900">{report.matchStats.totalMatches}</div>
                    <div className="text-gray-500">比赛</div>
                  </div>
                  <div>
                    <div className="font-bold text-green-600">{report.matchStats.wins}</div>
                    <div className="text-gray-500">胜</div>
                  </div>
                  <div>
                    <div className="font-bold text-red-600">{report.matchStats.losses}</div>
                    <div className="text-gray-500">负</div>
                  </div>
                  <div>
                    <div className="font-bold text-blue-600">{report.matchStats.winRate}%</div>
                    <div className="text-gray-500">胜率</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 强项 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              强项表现
            </h3>
            {isEditing ? (
              <div className="space-y-2">
                {editForm.strengths.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={s}
                      onChange={e => {
                        const newStrengths = [...editForm.strengths];
                        newStrengths[i] = e.target.value;
                        setEditForm({ ...editForm, strengths: newStrengths });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={() =>
                        setEditForm({
                          ...editForm,
                          strengths: editForm.strengths.filter((_, idx) => idx !== i),
                        })
                      }
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setEditForm({
                      ...editForm,
                      strengths: [...editForm.strengths, ''],
                    })
                  }
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  + 添加强项
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {report.strengths && report.strengths.length > 0 ? (
                  report.strengths.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-700">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      {s}
                    </li>
                  ))
                ) : (
                  <li className="text-gray-400">暂无数据</li>
                )}
              </ul>
            )}
          </div>

          {/* 待改进 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              待改进项
            </h3>
            {isEditing ? (
              <div className="space-y-2">
                {editForm.improvements.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={s}
                      onChange={e => {
                        const newImprovements = [...editForm.improvements];
                        newImprovements[i] = e.target.value;
                        setEditForm({
                          ...editForm,
                          improvements: newImprovements,
                        });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      onClick={() =>
                        setEditForm({
                          ...editForm,
                          improvements: editForm.improvements.filter((_, idx) => idx !== i),
                        })
                      }
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setEditForm({
                      ...editForm,
                      improvements: [...editForm.improvements, ''],
                    })
                  }
                  className="text-sm text-orange-600 hover:text-orange-700"
                >
                  + 添加改进项
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {report.improvements && report.improvements.length > 0 ? (
                  report.improvements.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-700">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      {s}
                    </li>
                  ))
                ) : (
                  <li className="text-gray-400">暂无数据</li>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* 下阶段目标 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            下阶段目标
          </h3>
          {isEditing ? (
            <div className="space-y-2">
              {editForm.goals.map((g, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={g}
                    onChange={e => {
                      const newGoals = [...editForm.goals];
                      newGoals[i] = e.target.value;
                      setEditForm({ ...editForm, goals: newGoals });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                  <button
                    onClick={() =>
                      setEditForm({
                        ...editForm,
                        goals: editForm.goals.filter((_, idx) => idx !== i),
                      })
                    }
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setEditForm({ ...editForm, goals: [...editForm.goals, ''] })}
                className="text-sm text-yellow-600 hover:text-yellow-700"
              >
                + 添加目标
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {report.goals && report.goals.length > 0 ? (
                report.goals.map((g, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-700">
                    <span className="w-5 h-5 bg-yellow-100 text-yellow-600 rounded-full text-xs flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    {g}
                  </li>
                ))
              ) : (
                <li className="text-gray-400">暂无数据</li>
              )}
            </ul>
          )}
        </div>

        {/* 教练评语 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            教练综合评语
          </h3>
          {isEditing ? (
            <textarea
              value={editForm.summary}
              onChange={e => setEditForm({ ...editForm, summary: e.target.value })}
              placeholder="请输入教练评语..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          ) : (
            <p className="text-gray-700 leading-relaxed">{report.summary || '暂无评语'}</p>
          )}
        </div>
      </main>
    </div>
  );
}
