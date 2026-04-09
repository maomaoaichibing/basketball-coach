'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/auth';
import { FileText, Plus, ChevronRight, Search, Calendar, User, Star } from 'lucide-react';

type AbilityMetrics = {
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

type GrowthReport = {
  id: string;
  playerId: string;
  playerName: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  reportType: string;
  abilities: AbilityMetrics;
  trainingStats: TrainingStats;
  matchStats: MatchStats;
  strengths: string[];
  improvements: string[];
  overallRating: number;
  summary: string;
  coachName: string;
  status: string;
  createdAt: string;
};

type PreviewData = {
  title: string;
  playerName: string;
  periodStart: string;
  periodEnd: string;
  reportType: string;
  abilities: AbilityMetrics;
  trainingStats: TrainingStats;
  matchStats: MatchStats;
  strengths: string[];
  improvements: string[];
  overallRating: number;
};

type Player = {
  id: string;
  name: string;
  group: string;
};

export default function GrowthReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<GrowthReport[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  // 创建表单状态
  const [createForm, setCreateForm] = useState({
    playerId: '',
    playerName: '',
    periodStart: '',
    periodEnd: '',
    reportType: 'quarterly',
  });

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedPlayer) params.set('playerId', selectedPlayer);

      const response = await fetch(`/api/growth-reports?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setReports(data.reports);
      }
    } catch (error) {
      console.error('获取成长报告列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPlayer]);

  const fetchPlayers = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/players?limit=100');
      const data = await response.json();
      if (data.success) {
        setPlayers(data.players);
      }
    } catch (error) {
      console.error('获取学员列表失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchReports();
    fetchPlayers();
  }, [selectedPlayer, fetchReports, fetchPlayers]);

  async function handlePreview() {
    if (!createForm.playerId || !createForm.periodStart || !createForm.periodEnd) {
      alert('请填写完整信息');
      return;
    }

    const selected = players.find((p) => p.id === createForm.playerId);
    if (selected) {
      setCreateForm({ ...createForm, playerName: selected.name });
    }

    try {
      const response = await fetchWithAuth('/api/growth-reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await response.json();

      if (data.success) {
        setPreviewData(data.preview);
        setShowPreview(true);
      } else {
        alert(data.error || '生成预览失败');
      }
    } catch (error) {
      console.error('生成预览失败:', error);
      alert('生成预览失败');
    }
  }

  async function handleCreateReport() {
    if (!previewData) return;

    try {
      const response = await fetchWithAuth('/api/growth-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: createForm.playerId,
          playerName: previewData.playerName,
          title: previewData.title,
          periodStart: previewData.periodStart,
          periodEnd: previewData.periodEnd,
          reportType: previewData.reportType,
          abilities: previewData.abilities,
          trainingStats: previewData.trainingStats,
          matchStats: previewData.matchStats,
          strengths: previewData.strengths,
          improvements: previewData.improvements,
          overallRating: previewData.overallRating,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowPreview(false);
        setShowCreateModal(false);
        setCreateForm({
          playerId: '',
          playerName: '',
          periodStart: '',
          periodEnd: '',
          reportType: 'quarterly',
        });
        setPreviewData(null);
        fetchReports();
        router.push(`/growth-reports/${data.report.id}`);
      }
    } catch (error) {
      console.error('创建报告失败:', error);
    }
  }

  const filteredReports = reports.filter((report) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      report.title.toLowerCase().includes(term) || report.playerName.toLowerCase().includes(term)
    );
  });

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    published: 'bg-green-100 text-green-700',
    viewed: 'bg-blue-100 text-blue-700',
  };

  const statusLabels: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    viewed: '已查看',
  };

  const reportTypeLabels: Record<string, string> = {
    monthly: '月度',
    quarterly: '季度',
    yearly: '年度',
    milestone: '里程碑',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-400 hover:text-gray-600">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </Link>
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-orange-500" />
                <h1 className="text-xl font-bold text-gray-900">成长档案</h1>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              生成报告
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 筛选栏 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索报告标题或学员姓名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">全部学员</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 报告列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无成长报告</h3>
            <p className="text-gray-500 mb-4">为学员生成第一份成长档案吧</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-orange-600 hover:text-orange-700"
            >
              生成报告 →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <Link
                key={report.id}
                href={`/growth-reports/${report.id}`}
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${statusColors[report.status]}`}>
                    {statusLabels[report.status]}
                  </span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                    {reportTypeLabels[report.reportType] || report.reportType}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{report.title}</h3>

                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <User className="w-4 h-4" />
                  {report.playerName}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(report.periodStart).toLocaleDateString('zh-CN', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' - '}
                    {new Date(report.periodEnd).toLocaleDateString('zh-CN', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* 能力雷达图简化展示 */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {report.abilities &&
                    Object.entries(report.abilities)
                      .slice(0, 6)
                      .map(([key, value]: [string, number]) => (
                        <div key={key} className="text-center">
                          <div className="text-lg font-bold text-orange-600">{value}</div>
                          <div className="text-xs text-gray-400">{key}</div>
                        </div>
                      ))}
                </div>

                {/* 综合评分 */}
                {report.overallRating && (
                  <div className="flex items-center justify-center gap-2 pt-3 border-t border-gray-100">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-700">
                      综合评分: {report.overallRating}/10
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* 创建报告弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">生成成长报告</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowPreview(false);
                    setPreviewData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            {!showPreview ? (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">选择学员 *</label>
                  <select
                    value={createForm.playerId}
                    onChange={(e) => {
                      const selected = players.find((p) => p.id === e.target.value);
                      setCreateForm({
                        ...createForm,
                        playerId: e.target.value,
                        playerName: selected?.name || '',
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">选择学员</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name} ({player.group})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      报告周期开始 *
                    </label>
                    <input
                      type="date"
                      value={createForm.periodStart}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          periodStart: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      报告周期结束 *
                    </label>
                    <input
                      type="date"
                      value={createForm.periodEnd}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          periodEnd: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">报告类型</label>
                  <select
                    value={createForm.reportType}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        reportType: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="monthly">月度报告</option>
                    <option value="quarterly">季度报告</option>
                    <option value="yearly">年度报告</option>
                    <option value="milestone">里程碑报告</option>
                  </select>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 text-sm text-orange-700">
                  <p>
                    系统将根据所选时间段内学员的训练记录、比赛数据和能力评估，自动生成成长报告。
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{previewData?.title}</h3>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>学员: {previewData?.playerName}</p>
                    <p>训练次数: {previewData?.trainingStats?.totalSessions || 0} 次</p>
                    <p>出勤率: {previewData?.trainingStats?.attendanceRate || 0}%</p>
                    <p>
                      比赛场次: {previewData?.matchStats?.totalMatches || 0} 场 (胜{' '}
                      {previewData?.matchStats?.wins || 0})
                    </p>
                    <p>综合评分: {previewData?.overallRating || 0}/10</p>
                  </div>
                </div>

                {/* 能力数据预览 */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">能力数据</h4>
                  <div className="grid grid-cols-6 gap-2">
                    {previewData?.abilities &&
                      Object.entries(previewData.abilities).map(
                        ([key, value]: [string, number]) => (
                          <div key={key} className="text-center bg-blue-50 rounded-lg p-2">
                            <div className="text-lg font-bold text-blue-600">{value}</div>
                            <div className="text-xs text-gray-500">{key}</div>
                          </div>
                        )
                      )}
                  </div>
                </div>

                {/* 强项 */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">强项</h4>
                  <ul className="space-y-1">
                    {previewData?.strengths?.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-green-600 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 待改进 */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">待改进</h4>
                  <ul className="space-y-1">
                    {previewData?.improvements?.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-orange-600 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowPreview(false);
                    setPreviewData(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                {!showPreview ? (
                  <button
                    onClick={handlePreview}
                    disabled={
                      !createForm.playerId || !createForm.periodStart || !createForm.periodEnd
                    }
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    生成预览
                  </button>
                ) : (
                  <button
                    onClick={handleCreateReport}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    创建报告
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
