'use client';

import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/auth';
import {
  Lightbulb,
  TrendingUp,
  Target,
  Star,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  User,
} from 'lucide-react';

interface Player {
  id: string;
  name: string;
  group: string;
  dribbling: number;
  passing: number;
  shooting: number;
  defending: number;
  physical: number;
  tactical: number;
}

interface Recommendation {
  type: string;
  priority: string;
  title: string;
  reason: string;
  suggestions: string[];
  skill?: string;
  score?: number;
  suggestedPosition?: string;
  alternatives?: string[];
}

interface PlayerInfo {
  name: string;
  abilities: {
    technical: Record<string, number>;
    tactical: Record<string, number>;
    physical: Record<string, number>;
    mental: Record<string, number>;
  };
}

export default function RecommendationsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const res = await fetchWithAuth('/api/players?status=training');
      const data = await res.json();
      setPlayers(data.players || []);
      if (data.players?.length > 0) {
        setSelectedPlayer(data.players[0].id);
      }
    } catch (error) {
      console.error('获取学员失败:', error);
    }
  };

  const fetchRecommendations = async () => {
    if (!selectedPlayer) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/recommendations?playerId=${selectedPlayer}&type=all`);
      const data = await res.json();
      setRecommendations(data.recommendations || []);
      setPlayerInfo(data.player);
    } catch (error) {
      console.error('获取推荐失败:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedPlayer) {
      fetchRecommendations();
    }
  }, [selectedPlayer]);

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, string> = {
      high: 'bg-red-100 text-red-700',
      normal: 'bg-blue-100 text-blue-700',
      low: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      high: '优先',
      normal: '建议',
      low: '可选',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${badges[priority] || 'bg-gray-100'}`}>
        {labels[priority] || priority}
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'training':
        return <Target className="w-5 h-5 text-orange-500" />;
      case 'strength':
        return <Star className="w-5 h-5 text-yellow-500" />;
      case 'position':
        return <User className="w-5 h-5 text-blue-500" />;
      case 'goal':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'assessment':
        return <AlertCircle className="w-5 h-5 text-purple-500" />;
      default:
        return <Lightbulb className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      training: '训练建议',
      strength: '优势发挥',
      position: '位置推荐',
      goal: '目标建议',
      assessment: '评估提醒',
    };
    return labels[type] || type;
  };

  const skillNames: Record<string, string> = {
    dribbling: '运球',
    passing: '传球',
    shooting: '投篮',
    defending: '防守',
    physical: '体能',
    tactical: '战术',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">智能推荐</h1>
              <p className="text-sm text-gray-500">基于球员能力数据的个性化建议</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Player Selector */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">选择学员:</label>
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg"
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} ({player.group})
                </option>
              ))}
            </select>
            <button
              onClick={fetchRecommendations}
              disabled={loading}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
        </div>

        {/* Player Skills Overview */}
        {playerInfo && (
          <div className="bg-white rounded-lg shadow p-5 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {playerInfo.name} - 能力雷达
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {['dribbling', 'passing', 'shooting', 'defending', 'physical', 'tactical'].map(
                (skill) => {
                  const player = players.find((p) => p.id === selectedPlayer);
                  const score = (player?.[skill as keyof Player] as number) || 5;
                  return (
                    <div key={skill} className="text-center">
                      <div className="relative w-16 h-16 mx-auto mb-2">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="#e5e7eb"
                            strokeWidth="6"
                            fill="none"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke={score >= 7 ? '#22c55e' : score >= 5 ? '#3b82f6' : '#ef4444'}
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={`${score * 17.6} 176`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                          {score}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">{skillNames[skill]}</span>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">加载中...</div>
        ) : recommendations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p>暂无推荐内容</p>
            <p className="text-sm mt-2">请选择学员获取个性化建议</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">{getTypeIcon(rec.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{rec.title}</h3>
                      {getPriorityBadge(rec.priority)}
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        {getTypeLabel(rec.type)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{rec.reason}</p>

                    {rec.suggestions && rec.suggestions.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">建议措施:</h4>
                        <ul className="space-y-2">
                          {rec.suggestions.map((suggestion, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {rec.type === 'position' && rec.suggestedPosition && (
                      <div className="mt-3 flex items-center gap-4">
                        <span className="text-sm text-gray-600">推荐位置:</span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {rec.suggestedPosition === 'guard'
                            ? '后卫'
                            : rec.suggestedPosition === 'forward'
                              ? '前锋'
                              : '中锋'}
                        </span>
                        {rec.alternatives && rec.alternatives.length > 0 && (
                          <span className="text-sm text-gray-500">
                            备选: {rec.alternatives.join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Placeholder Notice */}
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-purple-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">AI 智能推荐</h4>
              <p className="text-sm text-gray-600 mt-1">
                当前的推荐基于规则引擎生成。随着数据积累，未来将接入 AI
                大模型提供更精准、更个性化的训练建议和发展规划。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
