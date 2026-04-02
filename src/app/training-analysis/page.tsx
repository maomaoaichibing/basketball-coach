'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  AlertTriangle,
  Star,
  BarChart3,
  Filter,
} from 'lucide-react';

interface TrainingAnalysis {
  totalRecords: number;
  attendance: {
    present: number;
    absent: number;
    late: number;
    rate: string;
  };
  skillStats: Record<string, { avg: number }>;
  performanceTrend: {
    index: number;
    date: string;
    performance: number | null;
    effort: number | null;
    attitude: number | null;
  }[];
  monthlyStats: Record<string, number>;
  topIssues: { issue: string; count: number }[];
  topHighlights: { highlight: string; count: number }[];
  groupDistribution: { coachName: string; _count: number }[];
}

export default function TrainingAnalysisPage() {
  const [analysis, setAnalysis] = useState<TrainingAnalysis | null>(null);
  const [group, setGroup] = useState('');
  const [groups, setGroups] = useState<string[]>(['U6', 'U8', 'U10', 'U12', 'U14']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalysis();
  }, [group]);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (group) params.set('group', group);
      const res = await fetch(`/api/training-analysis?${params}`);
      const data = await res.json();
      setAnalysis(data);
    } catch (error) {
      console.error('获取训练分析失败:', error);
    }
    setLoading(false);
  };

  const skillNames: Record<string, string> = {
    dribbling: '运球',
    passing: '传球',
    shooting: '投篮',
    defending: '防守',
    physical: '体能',
    tactical: '战术',
  };

  const formatSkillName = (skill: string) => skillNames[skill] || skill;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">训练分析</h1>
                <p className="text-sm text-gray-500">训练数据统计与分析</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={group}
                onChange={e => setGroup(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="">全部分组</option>
                {groups.map(g => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-gray-500">加载中...</div>
        </div>
      ) : analysis ? (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">训练总次数</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{analysis.totalRecords}</div>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm text-gray-500">出勤率</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{analysis.attendance.rate}%</div>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-sm text-gray-500">出勤次数</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{analysis.attendance.present}</div>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-sm text-gray-500">缺勤次数</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{analysis.attendance.absent}</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Trend */}
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">表现趋势</h3>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
              {analysis.performanceTrend.length > 0 ? (
                <div className="space-y-3">
                  {analysis.performanceTrend.map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <span className="text-xs text-gray-400 w-12">{item.date}</span>
                      <div className="flex-1 flex gap-2">
                        {item.performance && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">表现</span>
                            <div className="w-16 bg-gray-100 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${item.performance * 10}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium">{item.performance}</span>
                          </div>
                        )}
                        {item.effort && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">努力</span>
                            <div className="w-16 bg-gray-100 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${item.effort * 10}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium">{item.effort}</span>
                          </div>
                        )}
                        {item.attitude && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">态度</span>
                            <div className="w-16 bg-gray-100 rounded-full h-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full"
                                style={{ width: `${item.attitude * 10}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium">{item.attitude}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">暂无数据</div>
              )}
            </div>

            {/* Skill Stats */}
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">技能评分</h3>
                <Activity className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                {Object.entries(analysis.skillStats).length > 0 ? (
                  Object.entries(analysis.skillStats).map(([skill, stats]) => (
                    <div key={skill} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-16">{formatSkillName(skill)}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            stats.avg >= 7
                              ? 'bg-green-500'
                              : stats.avg >= 5
                                ? 'bg-blue-500'
                                : 'bg-orange-500'
                          }`}
                          style={{ width: `${stats.avg * 10}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-12 text-right">
                        {stats.avg.toFixed(1)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-8">暂无数据</div>
                )}
              </div>
            </div>
          </div>

          {/* Issues and Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Issues */}
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">高频问题</h3>
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
              {analysis.topIssues.length > 0 ? (
                <div className="space-y-3">
                  {analysis.topIssues.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm text-gray-700">{item.issue}</span>
                      <span className="text-sm text-gray-400">{item.count}次</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">暂无数据</div>
              )}
            </div>

            {/* Top Highlights */}
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">高频亮点</h3>
                <Star className="w-5 h-5 text-yellow-400" />
              </div>
              {analysis.topHighlights.length > 0 ? (
                <div className="space-y-3">
                  {analysis.topHighlights.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm text-gray-700">{item.highlight}</span>
                      <span className="text-sm text-gray-400">{item.count}次</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">暂无数据</div>
              )}
            </div>
          </div>

          {/* Coach Distribution */}
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">教练训练分布</h3>
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {analysis.groupDistribution.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-24">{item.coachName || '未分配'}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(item._count / (analysis.groupDistribution[0]?._count || 1)) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-16 text-right">
                    {item._count}次
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-gray-500">暂无数据</div>
        </div>
      )}
    </div>
  );
}
