'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, Target, Users } from 'lucide-react';

// 类型定义
type AssessmentHistory = {
  date: string;
  dribbling?: number;
  passing?: number;
  shooting?: number;
  defending?: number;
  physical?: number;
  tactical?: number;
  overall?: number;
};

type Player = {
  id: string;
  name: string;
  group: string;
  status: string;
  avatar: string;
  abilities: {
    dribbling: number;
    passing: number;
    shooting: number;
    defending: number;
    physical: number;
    tactical: number;
  };
  avgAbility: number;
  trend: Record<string, number>;
  lastAssessment: string | null;
  totalTrainings: number;
  attendanceRate: number;
  presentCount: number;
  absentCount: number;
  assessmentHistory: AssessmentHistory[];
};

// 雷达图组件
function RadarChart({ abilities, size = 200 }: { abilities: Player['abilities']; size?: number }) {
  const labels = ['运球', '传球', '投篮', '防守', '体能', '战术'];
  const keys = ['dribbling', 'passing', 'shooting', 'defending', 'physical', 'tactical'];
  const values = keys.map(k => abilities[k as keyof typeof abilities] || 5);

  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - 20;

  // 计算多边形顶点
  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const radius = (value / 10) * maxRadius;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  // 生成网格线
  const gridLevels = [2, 4, 6, 8, 10];

  // 数据点多边形
  const dataPoints = values.map((v, i) => getPoint(i, v));
  const polygonPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* 网格线 */}
      {gridLevels.map(level => {
        const points = keys
          .map((_, i) => {
            const p = getPoint(i, level);
            return `${p.x},${p.y}`;
          })
          .join(' ');
        return <polygon key={level} points={points} fill="none" stroke="#e5e7eb" strokeWidth="1" />;
      })}

      {/* 轴线 */}
      {keys.map((_, i) => {
        const p = getPoint(i, 10);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth="1" />;
      })}

      {/* 数据区域 */}
      <polygon
        points={polygonPoints}
        fill="rgba(249, 115, 22, 0.2)"
        stroke="#f97316"
        strokeWidth="2"
      />

      {/* 数据点 */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#f97316" />
      ))}

      {/* 标签 */}
      {labels.map((label, i) => {
        const p = getPoint(i, 10.8);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs fill-gray-600 font-medium"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// 能力条形图组件
function AbilityBars({
  abilities,
  trend,
}: {
  abilities: Player['abilities'];
  trend: Record<string, number>;
}) {
  const labels: Record<string, string> = {
    dribbling: '运球',
    passing: '传球',
    shooting: '投篮',
    defending: '防守',
    physical: '体能',
    tactical: '战术',
  };

  return (
    <div className="space-y-3">
      {Object.entries(abilities).map(([key, value]) => {
        const label = labels[key] || key;
        const change = trend[key] || 0;
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-12 text-sm text-gray-600">{label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-yellow-400 transition-all duration-500"
                style={{ width: `${value * 10}%` }}
              />
            </div>
            <span className="w-8 text-sm font-semibold text-gray-900 text-right">{value}</span>
            {change !== 0 && (
              <span
                className={`flex items-center gap-0.5 text-xs ${change > 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {change > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {change > 0 ? '+' : ''}
                {change}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function GrowthPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [viewMode, setViewMode] = useState<'chart' | 'bars'>('chart');

  const fetchGrowthData = useCallback(async () => {
    try {
      setLoading(true);
      const url = selectedGroup !== 'all' ? `/api/growth?group=${selectedGroup}` : '/api/growth';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setPlayers(data.players);
      }
    } catch (error) {
      console.error('获取成长数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedGroup]);

  useEffect(() => {
    fetchGrowthData();
  }, [fetchGrowthData]);

  const labels: Record<string, string> = {
    dribbling: '运球',
    passing: '传球',
    shooting: '投篮',
    defending: '防守',
    physical: '体能',
    tactical: '战术',
  };

  const statusLabels: Record<string, string> = {
    trial: '试听',
    training: '在训',
    vacation: '请假',
    suspended: '停课',
    graduated: '结业',
  };

  const groups = Array.from(new Set(players.map(p => p.group))).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900">成长追踪</h1>
            </div>
            {/* 筛选 */}
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">全部年龄段</option>
              {groups.map(g => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">暂无学员数据</p>
            <Link href="/players" className="text-orange-500 hover:underline">
              去添加学员
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：学员列表 */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="font-semibold text-gray-700">学员 ({players.length})</h2>
              {players.map(player => (
                <div
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer transition-all ${
                    selectedPlayer?.id === player.id
                      ? 'border-orange-500 ring-2 ring-orange-100'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-bold">
                      {player.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{player.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                          {player.group}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        能力均值 {player.avgAbility.toFixed(1)}
                      </div>
                    </div>
                  </div>

                  {/* 趋势指示器 */}
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    {Object.entries(player.trend).map(([skill, value]) => (
                      <span
                        key={skill}
                        className={`flex items-center gap-0.5 ${
                          value > 0
                            ? 'text-green-600'
                            : value < 0
                              ? 'text-red-600'
                              : 'text-gray-400'
                        }`}
                      >
                        {labels[skill].charAt(0)}
                        {value > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : value < 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 右侧：详情视图 */}
            <div className="lg:col-span-2">
              {selectedPlayer ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* 学员头部 */}
                  <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-yellow-50">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        {selectedPlayer.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-bold text-gray-900">{selectedPlayer.name}</h2>
                          <span className="px-2 py-0.5 bg-white text-orange-600 text-xs rounded-full font-medium">
                            {statusLabels[selectedPlayer.status]}
                          </span>
                          <span className="text-sm text-gray-500">{selectedPlayer.group}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>
                            最近评估:{' '}
                            {selectedPlayer.lastAssessment
                              ? new Date(selectedPlayer.lastAssessment).toLocaleDateString()
                              : '暂无'}
                          </span>
                          <span>训练 {selectedPlayer.totalTrainings} 次</span>
                          <span>出勤率 {selectedPlayer.attendanceRate}%</span>
                        </div>
                      </div>
                    </div>

                    {/* 能力雷达图 */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-700">能力评估</h3>
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => setViewMode('chart')}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                              viewMode === 'chart'
                                ? 'bg-white shadow text-orange-600'
                                : 'text-gray-500'
                            }`}
                          >
                            雷达图
                          </button>
                          <button
                            onClick={() => setViewMode('bars')}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                              viewMode === 'bars'
                                ? 'bg-white shadow text-orange-600'
                                : 'text-gray-500'
                            }`}
                          >
                            柱状图
                          </button>
                        </div>
                      </div>

                      {viewMode === 'chart' ? (
                        <div className="flex justify-center">
                          <RadarChart abilities={selectedPlayer.abilities} size={240} />
                        </div>
                      ) : (
                        <AbilityBars
                          abilities={selectedPlayer.abilities}
                          trend={selectedPlayer.trend}
                        />
                      )}
                    </div>
                  </div>

                  {/* 历史评估 */}
                  <div className="p-6">
                    <h3 className="font-semibold text-gray-700 mb-4">评估历史</h3>
                    {selectedPlayer.assessmentHistory.length > 0 ? (
                      <div className="space-y-3">
                        {selectedPlayer.assessmentHistory.map((assessment, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="text-sm text-gray-500 w-24">
                              {new Date(assessment.date).toLocaleDateString()}
                            </div>
                            <div className="flex-1 flex items-center gap-4 text-xs">
                              {Object.entries(labels).map(([skill, label]) => {
                                const value = (
                                  assessment as unknown as { [key: string]: number | undefined }
                                )[skill];
                                if (!value) return null;
                                return (
                                  <span key={skill} className="flex items-center gap-1">
                                    <span className="text-gray-400">{label}:</span>
                                    <span className="font-medium">{value}</span>
                                  </span>
                                );
                              })}
                            </div>
                            {assessment.overall && (
                              <div className="text-sm font-semibold text-orange-600">
                                综合: {assessment.overall}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">暂无评估记录</p>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="p-6 pt-0 flex gap-3">
                    <Link
                      href={`/players/${selectedPlayer.id}`}
                      className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-center font-medium hover:bg-orange-600 transition-colors"
                    >
                      查看完整档案
                    </Link>
                    <Link
                      href="/assessment"
                      className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      评估记录
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                  <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">点击左侧学员查看成长详情</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
