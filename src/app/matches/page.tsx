'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/auth';
import {
  Trophy,
  Plus,
  Calendar,
  MapPin,
  Users,
  ChevronRight,
  Search,
  Filter,
  Medal,
  Target,
  TrendingUp,
  Clock,
} from 'lucide-react';

type Match = {
  id: string;
  title: string;
  matchType: string;
  group: string;
  matchDate: string;
  location: string;
  teamName?: string;
  homeScore: number;
  opponent: string;
  opponentScore: number;
  result: string;
  isHome: boolean;
  status: string;
  _count?: { events: number };
};

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedResult, setSelectedResult] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 创建表单状态
  const [createForm, setCreateForm] = useState({
    title: '',
    matchType: 'league',
    group: 'U10',
    matchDate: '',
    location: '',
    opponent: '',
    teamName: '',
    isHome: true,
  });

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedGroup) params.set('group', selectedGroup);
      if (selectedResult) params.set('result', selectedResult);

      const response = await fetch(`/api/matches?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setMatches(data.matches);
      }
    } catch (error) {
      console.error('获取比赛列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedGroup, selectedResult]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  async function handleCreateMatch() {
    try {
      const response = await fetchWithAuth('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          matchDate: new Date(createForm.matchDate).toISOString(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowCreateModal(false);
        setCreateForm({
          title: '',
          matchType: 'league',
          group: 'U10',
          matchDate: '',
          location: '',
          opponent: '',
          teamName: '',
          isHome: true,
        });
        fetchMatches();
        router.push(`/matches/${data.match.id}`);
      }
    } catch (error) {
      console.error('创建比赛失败:', error);
    }
  }

  const filteredMatches = matches.filter(match => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      match.title.toLowerCase().includes(term) ||
      match.opponent.toLowerCase().includes(term) ||
      match.teamName?.toLowerCase().includes(term) ||
      match.location.toLowerCase().includes(term)
    );
  });

  const stats = {
    total: matches.length,
    wins: matches.filter(m => m.result === 'win').length,
    losses: matches.filter(m => m.result === 'lose').length,
    draws: matches.filter(m => m.result === 'draw').length,
  };

  const resultColors: Record<string, string> = {
    win: 'bg-green-100 text-green-700',
    lose: 'bg-red-100 text-red-700',
    draw: 'bg-gray-100 text-gray-700',
    pending: 'bg-yellow-100 text-yellow-700',
  };

  const resultLabels: Record<string, string> = {
    win: '胜',
    lose: '负',
    draw: '平',
    pending: '待定',
  };

  const matchTypeLabels: Record<string, string> = {
    league: '联赛',
    cup: '杯赛',
    friendly: '友谊赛',
    practice: '内部赛',
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
                <Trophy className="w-6 h-6 text-orange-500" />
                <h1 className="text-xl font-bold text-gray-900">比赛记录</h1>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              记录比赛
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-500">总比赛</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Medal className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.wins}</div>
                <div className="text-sm text-gray-500">获胜</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.losses}</div>
                <div className="text-sm text-gray-500">失利</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">{stats.draws}</div>
                <div className="text-sm text-gray-500">平局</div>
              </div>
            </div>
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索比赛、对手..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">全部分组</option>
                <option value="U6">U6</option>
                <option value="U8">U8</option>
                <option value="U10">U10</option>
                <option value="U12">U12</option>
                <option value="U14">U14</option>
              </select>
              <select
                value={selectedResult}
                onChange={e => setSelectedResult(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">全部结果</option>
                <option value="win">胜</option>
                <option value="lose">负</option>
                <option value="draw">平</option>
              </select>
            </div>
          </div>
        </div>

        {/* 比赛列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无比赛记录</h3>
            <p className="text-gray-500 mb-4">开始记录第一场比赛吧</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-orange-600 hover:text-orange-700"
            >
              记录比赛 →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMatches.map(match => (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${resultColors[match.result]}`}
                    >
                      {resultLabels[match.result]}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {matchTypeLabels[match.matchType] || match.matchType}
                    </span>
                  </div>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                    {match.group}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2">{match.title}</h3>

                {/* 比分 */}
                <div className="flex items-center justify-center gap-4 py-3 bg-gray-50 rounded-lg mb-3">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">
                      {match.isHome ? '我方' : match.opponent}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {match.isHome ? match.homeScore : match.opponentScore}
                    </div>
                  </div>
                  <div className="text-gray-300 text-lg">-</div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">
                      {match.isHome ? match.opponent : '我方'}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {match.isHome ? match.opponentScore : match.homeScore}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(match.matchDate).toLocaleDateString('zh-CN')}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {match.location || '未知地点'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* 创建比赛弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">记录比赛</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">比赛标题 *</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="如: 2024年春季联赛第三轮"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">比赛类型</label>
                  <select
                    value={createForm.matchType}
                    onChange={e =>
                      setCreateForm({
                        ...createForm,
                        matchType: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="league">联赛</option>
                    <option value="cup">杯赛</option>
                    <option value="friendly">友谊赛</option>
                    <option value="practice">内部赛</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分组</label>
                  <select
                    value={createForm.group}
                    onChange={e => setCreateForm({ ...createForm, group: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="U6">U6</option>
                    <option value="U8">U8</option>
                    <option value="U10">U10</option>
                    <option value="U12">U12</option>
                    <option value="U14">U14</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">比赛日期 *</label>
                  <input
                    type="datetime-local"
                    value={createForm.matchDate}
                    onChange={e =>
                      setCreateForm({
                        ...createForm,
                        matchDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">比赛地点</label>
                  <input
                    type="text"
                    value={createForm.location}
                    onChange={e => setCreateForm({ ...createForm, location: e.target.value })}
                    placeholder="如: 篮球馆"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">对手名称 *</label>
                <input
                  type="text"
                  value={createForm.opponent}
                  onChange={e => setCreateForm({ ...createForm, opponent: e.target.value })}
                  placeholder="如: 阳光队"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">我方球队名称</label>
                <input
                  type="text"
                  value={createForm.teamName}
                  onChange={e => setCreateForm({ ...createForm, teamName: e.target.value })}
                  placeholder="如: 雄鹰队"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={createForm.isHome}
                    onChange={e => setCreateForm({ ...createForm, isHome: e.target.checked })}
                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">主场比赛</span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateMatch}
                  disabled={!createForm.title || !createForm.matchDate || !createForm.opponent}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  创建比赛
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
