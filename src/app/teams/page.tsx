'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Users,
  Search,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  Clock,
  ChevronRight,
  X,
  User,
} from 'lucide-react';

// 球队类型
type Team = {
  id: string;
  name: string;
  group: string;
  coachName?: string;
  coachPhone?: string;
  location?: string;
  trainingTime?: string;
  playerCount: number;
  createdAt: string;
};

const groups = ['all', 'U6', 'U8', 'U10', 'U12', 'U14'];

const groupColors: Record<string, string> = {
  U6: 'bg-red-100 text-red-700',
  U8: 'bg-orange-100 text-orange-700',
  U10: 'bg-yellow-100 text-yellow-700',
  U12: 'bg-green-100 text-green-700',
  U14: 'bg-blue-100 text-blue-700',
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // 新建/编辑表单
  const [formData, setFormData] = useState({
    name: '',
    group: 'U10',
    coachName: '',
    coachPhone: '',
    location: '',
    trainingTime: '',
  });

  useEffect(() => {
    fetchTeams();
  }, [groupFilter]);

  async function fetchTeams() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (groupFilter !== 'all') params.set('group', groupFilter);

      const response = await fetch(`/api/teams?${params}`);
      const data = await response.json();

      if (data.success) {
        setTeams(data.teams);
      }
    } catch (error) {
      console.error('获取球队列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const url = editingTeam ? `/api/teams/${editingTeam.id}` : '/api/teams';
      const method = editingTeam ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setShowAddModal(false);
        setEditingTeam(null);
        resetForm();
        fetchTeams();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败');
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`确定要删除球队「${name}」吗？`)) return;

    try {
      const response = await fetch(`/api/teams/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchTeams();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      group: 'U10',
      coachName: '',
      coachPhone: '',
      location: '',
      trainingTime: '',
    });
  }

  function openEditModal(team: Team) {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      group: team.group,
      coachName: team.coachName || '',
      coachPhone: team.coachPhone || '',
      location: team.location || '',
      trainingTime: team.trainingTime || '',
    });
    setShowAddModal(true);
  }

  // 过滤球队
  const filteredTeams = teams.filter(team => {
    if (
      search &&
      !team.name.toLowerCase().includes(search.toLowerCase()) &&
      !team.coachName?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

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
              <h1 className="text-xl font-bold text-gray-900">球队管理</h1>
            </div>
            <button
              onClick={() => {
                resetForm();
                setEditingTeam(null);
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Plus className="w-4 h-4" />
              新建球队
            </button>
          </div>

          {/* 搜索和筛选 */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索球队名称或教练..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex items-center gap-2">
              {groups.map(g => (
                <button
                  key={g}
                  onClick={() => setGroupFilter(g)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    groupFilter === g
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {g === 'all' ? '全部' : g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* 球队列表 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-2 text-gray-500">加载中...</p>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无球队</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-red-600 hover:text-red-700"
            >
              创建第一个球队
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTeams.map(team => (
              <div
                key={team.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{team.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${groupColors[team.group] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {team.group}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {team.playerCount}人
                      </div>
                      {team.coachName && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {team.coachName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(team)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(team.id, team.name)}
                      className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 训练信息 */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {team.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {team.location}
                      </div>
                    )}
                    {team.trainingTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {team.trainingTime}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 新建/编辑弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editingTeam ? '编辑球队' : '新建球队'}</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingTeam(null);
                  resetForm();
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">球队名称 *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：火焰队、雷霆队"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">年龄组 *</label>
                <select
                  value={formData.group}
                  onChange={e => setFormData({ ...formData, group: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {groups
                    .filter(g => g !== 'all')
                    .map(g => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">教练姓名</label>
                <input
                  type="text"
                  value={formData.coachName}
                  onChange={e => setFormData({ ...formData, coachName: e.target.value })}
                  placeholder="主教练姓名"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">教练电话</label>
                <input
                  type="tel"
                  value={formData.coachPhone}
                  onChange={e => setFormData({ ...formData, coachPhone: e.target.value })}
                  placeholder="教练联系电话"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">训练地点</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="如：体育馆、篮球场"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">训练时间</label>
                <input
                  type="text"
                  value={formData.trainingTime}
                  onChange={e => setFormData({ ...formData, trainingTime: e.target.value })}
                  placeholder="如：周六 14:00-16:00"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingTeam(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  {editingTeam ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
