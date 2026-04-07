'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/auth';

interface Player {
  id: string;
  name: string;
  group: string;
}

interface Recommendation {
  id: string;
  playerId: string;
  playerName: string;
  recommendType: string;
  title: string;
  content: string;
  reason: string;
  priority: number;
  status: string;
  isAuto: boolean;
  createdAt: string;
}

interface AbilityAnalysis {
  id: string;
  playerId: string;
  playerName: string;
  overallScore: number;
  dimensions: string;
  progress: string;
  strengths: string;
  weaknesses: string;
  createdAt: string;
}

interface TeamRecommendation {
  id: string;
  playerId: string;
  playerName: string;
  currentTeamName: string;
  recommendedTeamName: string;
  recommendedGroup: string;
  reason: string;
  abilityMatch: number;
  status: string;
  createdAt: string;
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'analysis' | 'teams'>(
    'recommendations'
  );
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [analyses, setAnalyses] = useState<AbilityAnalysis[]>([]);
  const [teamRecommendations, setTeamRecommendations] = useState<TeamRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/players');
      const data = await res.json();
      setPlayers(data.players || data || []);
    } catch (error) {
      console.error('获取学员列表失败:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, analysisRes, teamRes] = await Promise.all([
        fetchWithAuth(`/api/recommendations${selectedPlayer ? `?playerId=${selectedPlayer}` : ''}`),
        fetchWithAuth(
          `/api/ability-analysis${selectedPlayer ? `?playerId=${selectedPlayer}` : ''}`
        ),
        fetchWithAuth(
          `/api/team-recommendations${selectedPlayer ? `?playerId=${selectedPlayer}` : ''}`
        ),
      ]);

      const [recData, analysisData, teamData] = await Promise.all([
        recRes.json(),
        analysisRes.json(),
        teamRes.json(),
      ]);

      setRecommendations(Array.isArray(recData) ? recData : []);
      setAnalyses(Array.isArray(analysisData) ? analysisData : []);
      setTeamRecommendations(Array.isArray(teamData) ? teamData : []);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPlayer]);

  useEffect(() => {
    fetchPlayers();
    fetchData();
  }, [fetchPlayers, fetchData]);

  useEffect(() => {
    if (selectedPlayer) {
      fetchData();
    }
  }, [selectedPlayer, fetchData]);

  const handleGenerateAnalysis = async () => {
    if (!selectedPlayer) {
      alert('请先选择学员');
      return;
    }

    setGenerating(true);
    try {
      const res = await fetchWithAuth('/api/analytics/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: selectedPlayer }),
      });

      if (res.ok) {
        alert('智能分析生成成功！');
        fetchData();
      } else {
        alert('生成失败，请重试');
      }
    } catch (error) {
      console.error('生成失败:', error);
      alert('生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateRecommendation = async (id: string, status: string) => {
    try {
      const res = await fetchWithAuth(`/api/recommendations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('更新失败:', error);
    }
  };

  const handleTeamRecommendation = async (rec: TeamRecommendation, accepted: boolean) => {
    try {
      const res = await fetchWithAuth('/api/team-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: rec.playerId,
          playerName: rec.playerName,
          currentTeamId: rec.currentTeamName,
          currentTeamName: rec.currentTeamName,
          recommendedTeamId: rec.recommendedTeamName,
          recommendedTeamName: rec.recommendedTeamName,
          recommendedGroup: rec.recommendedGroup,
          reason: rec.reason,
          abilityMatch: rec.abilityMatch,
          status: accepted ? 'accepted' : 'rejected',
          handledBy: 'coach',
          handledAt: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('处理失败:', error);
    }
  };

  const getTypeName = (type: string) => {
    const map: Record<string, string> = {
      training: '训练建议',
      class: '分班建议',
      match: '比赛推荐',
      skill: '技能提升',
    };
    return map[type] || type;
  };

  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'bg-red-100 text-red-700';
    if (priority === 2) return 'bg-orange-100 text-orange-700';
    if (priority === 3) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      accepted: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      completed: 'bg-blue-100 text-blue-700',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">智能分析中心</h1>
              <p className="text-sm text-gray-500 mt-1">AI驱动的训练建议与学员分析</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">全部学员</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} ({player.group})
                  </option>
                ))}
              </select>
              <button
                onClick={handleGenerateAnalysis}
                disabled={!selectedPlayer || generating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? '生成中...' : '生成分析'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'recommendations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              智能推荐
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analysis'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              能力分析
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'teams'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              分班推荐
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* 智能推荐 Tab */}
            {activeTab === 'recommendations' && (
              <div className="space-y-4">
                {recommendations.length === 0 ? (
                  <div className="bg-white rounded-xl p-8 text-center">
                    <p className="text-gray-500">暂无智能推荐</p>
                    <p className="text-sm text-gray-400 mt-2">选择学员后点击「生成分析」获取推荐</p>
                  </div>
                ) : (
                  recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(rec.priority)}`}
                            >
                              {rec.priority === 1 ? '高优' : rec.priority === 2 ? '中优' : '普通'}
                            </span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              {getTypeName(rec.recommendType)}
                            </span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {rec.playerName}
                            </span>
                            {rec.isAuto && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                AI生成
                              </span>
                            )}
                          </div>
                          <h3 className="font-medium text-gray-900 mb-1">{rec.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{rec.content}</p>
                          {rec.reason && (
                            <p className="text-xs text-gray-400">推荐理由：{rec.reason}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${getStatusColor(rec.status)}`}
                          >
                            {rec.status === 'pending'
                              ? '待处理'
                              : rec.status === 'accepted'
                                ? '已接受'
                                : rec.status === 'rejected'
                                  ? '已拒绝'
                                  : '已完成'}
                          </span>
                          {rec.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateRecommendation(rec.id, 'accepted')}
                                className="px-3 py-1 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100"
                              >
                                接受
                              </button>
                              <button
                                onClick={() => handleUpdateRecommendation(rec.id, 'rejected')}
                                className="px-3 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100"
                              >
                                拒绝
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 能力分析 Tab */}
            {activeTab === 'analysis' && (
              <div className="space-y-4">
                {analyses.length === 0 ? (
                  <div className="bg-white rounded-xl p-8 text-center">
                    <p className="text-gray-500">暂无能力分析</p>
                    <p className="text-sm text-gray-400 mt-2">
                      选择学员后点击「生成分析」获取分析报告
                    </p>
                  </div>
                ) : (
                  analyses.map((analysis) => {
                    const dimensions = JSON.parse(analysis.dimensions || '{}') || {};
                    const progress = JSON.parse(analysis.progress || '{}') || {};
                    const strengths = JSON.parse(analysis.strengths || '[]') || [];
                    const weaknesses = JSON.parse(analysis.weaknesses || '[]') || [];

                    return (
                      <div
                        key={analysis.id}
                        className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium text-gray-900">{analysis.playerName}</h3>
                            <p className="text-sm text-gray-500">
                              {new Date(analysis.createdAt).toLocaleDateString()} 分析报告
                            </p>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600">
                              {analysis.overallScore}
                            </div>
                            <div className="text-xs text-gray-500">综合评分</div>
                          </div>
                        </div>

                        {/* 能力维度 */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                          {Object.entries(dimensions).map(([key, value]) => (
                            <div key={key} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600">
                                  {key === 'dribbling'
                                    ? '运球'
                                    : key === 'shooting'
                                      ? '投篮'
                                      : key === 'passing'
                                        ? '传球'
                                        : key === 'defending'
                                          ? '防守'
                                          : key === 'physical'
                                            ? '体能'
                                            : key === 'tactical'
                                              ? '战术'
                                              : key}
                                </span>
                                <span className="text-sm font-medium">{value as number}</span>
                              </div>
                              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{
                                    width: `${(value as number) * 10}%`,
                                  }}
                                ></div>
                              </div>
                              {progress[key] && (
                                <span
                                  className={`text-xs ${(progress[key] as string).startsWith('+') ? 'text-green-600' : 'text-red-600'}`}
                                >
                                  {progress[key]}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* 强项与弱项 */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-green-50 rounded-lg p-3">
                            <h4 className="text-sm font-medium text-green-800 mb-2">强项</h4>
                            <ul className="text-xs text-green-700 space-y-1">
                              {strengths.length > 0 ? (
                                strengths.map((s: string, i: number) => <li key={i}>• {s}</li>)
                              ) : (
                                <li>暂无明显强项</li>
                              )}
                            </ul>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-3">
                            <h4 className="text-sm font-medium text-orange-800 mb-2">待改进</h4>
                            <ul className="text-xs text-orange-700 space-y-1">
                              {weaknesses.length > 0 ? (
                                weaknesses.map((w: string, i: number) => <li key={i}>• {w}</li>)
                              ) : (
                                <li>暂无明显弱项</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* 分班推荐 Tab */}
            {activeTab === 'teams' && (
              <div className="space-y-4">
                {teamRecommendations.length === 0 ? (
                  <div className="bg-white rounded-xl p-8 text-center">
                    <p className="text-gray-500">暂无分班推荐</p>
                    <p className="text-sm text-gray-400 mt-2">系统会根据学员能力自动生成分班建议</p>
                  </div>
                ) : (
                  teamRecommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900">{rec.playerName}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${getStatusColor(rec.status)}`}
                            >
                              {rec.status === 'pending'
                                ? '待确认'
                                : rec.status === 'accepted'
                                  ? '已接受'
                                  : '已拒绝'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-500">
                              当前班级：{rec.currentTeamName || '未分班'}
                            </span>
                            <span className="text-blue-600">→</span>
                            <span className="text-green-600 font-medium">
                              推荐：{rec.recommendedTeamName} ({rec.recommendedGroup})
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">{rec.reason}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-gray-400">
                              能力匹配度：{rec.abilityMatch}%
                            </span>
                            <span className="text-xs text-gray-400">
                              推荐时间：
                              {new Date(rec.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {rec.status === 'pending' && (
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleTeamRecommendation(rec, true)}
                              className="px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm hover:bg-green-100"
                            >
                              接受调班
                            </button>
                            <button
                              onClick={() => handleTeamRecommendation(rec, false)}
                              className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm hover:bg-gray-100"
                            >
                              暂不调整
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
