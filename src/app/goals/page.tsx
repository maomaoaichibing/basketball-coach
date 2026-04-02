'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Target,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Trash2,
  Edit,
  Award,
} from 'lucide-react';

// 类型定义
type Player = {
  id: string;
  name: string;
  group: string;
};

type Goal = {
  id: string;
  playerId: string;
  player: Player;
  skillType: string;
  targetScore: number;
  currentScore: number;
  status: string;
  targetDate: string | null;
  achievedAt: string | null;
  createdAt: string;
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
  dribbling: 'bg-orange-100 text-orange-700',
  passing: 'bg-blue-100 text-blue-700',
  shooting: 'bg-green-100 text-green-700',
  defending: 'bg-purple-100 text-purple-700',
  physical: 'bg-red-100 text-red-700',
  tactical: 'bg-yellow-100 text-yellow-700',
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // 表单状态
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [skillType, setSkillType] = useState('dribbling');
  const [targetScore, setTargetScore] = useState(8);
  const [targetDate, setTargetDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [goalsRes, playersRes] = await Promise.all([
        fetch('/api/goals'),
        fetch('/api/players?status=training'),
      ]);

      const goalsData = await goalsRes.json();
      const playersData = await playersRes.json();

      if (goalsData.success) setGoals(goalsData.goals);
      if (playersData.success) setPlayers(playersData.players);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setSelectedPlayerId('');
    setSkillType('dribbling');
    setTargetScore(8);
    setTargetDate('');
    setEditingGoal(null);
    setShowForm(true);
  }

  function openEditForm(goal: Goal) {
    setSelectedPlayerId(goal.playerId);
    setSkillType(goal.skillType);
    setTargetScore(goal.targetScore);
    setTargetDate(goal.targetDate ? goal.targetDate.split('T')[0] : '');
    setEditingGoal(goal);
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!selectedPlayerId) {
      alert('请选择学员');
      return;
    }

    try {
      if (editingGoal) {
        // 更新
        await fetch(`/api/goals/${editingGoal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetScore,
            targetDate: targetDate || null,
          }),
        });
      } else {
        // 创建
        await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: selectedPlayerId,
            skillType,
            targetScore,
            targetDate: targetDate || null,
          }),
        });
      }

      setShowForm(false);
      fetchData();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    }
  }

  async function handleUpdateStatus(goal: Goal, newStatus: string) {
    try {
      await fetch(`/api/goals/${goal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchData();
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  }

  async function handleDeleteGoal(goal: Goal) {
    if (!confirm('确定要删除这个目标吗？')) return;

    try {
      await fetch(`/api/goals/${goal.id}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch (error) {
      console.error('删除失败:', error);
    }
  }

  // 按状态分组
  const activeGoals = goals.filter(g => g.status === 'active');
  const achievedGoals = goals.filter(g => g.status === 'achieved');

  const getProgress = (goal: Goal) => {
    return Math.min(100, Math.round((goal.currentScore / goal.targetScore) * 100));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">阶段目标</h1>
                <p className="text-sm text-gray-500">
                  {activeGoals.length} 个进行中 · {achievedGoals.length} 个已达成
                </p>
              </div>
            </div>
            <button
              onClick={openCreateForm}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
            >
              <Plus className="w-4 h-4" />
              设置目标
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {showForm ? (
          /* 目标表单 */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">
              {editingGoal ? '编辑目标' : '设置新目标'}
            </h2>

            <div className="space-y-5">
              {/* 选择学员 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择学员 <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedPlayerId}
                  onChange={e => setSelectedPlayerId(e.target.value)}
                  disabled={!!editingGoal}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                >
                  <option value="">请选择学员</option>
                  {players.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} ({player.group})
                    </option>
                  ))}
                </select>
              </div>

              {/* 选择技能 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  目标技能 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(skillLabels).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setSkillType(key)}
                      disabled={!!editingGoal}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                        skillType === key
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 目标分数 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  目标分数 (1-10)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={targetScore}
                    onChange={e => setTargetScore(parseInt(e.target.value))}
                    className="flex-1 accent-orange-500"
                  />
                  <span className="w-12 text-center font-bold text-xl text-orange-600">
                    {targetScore}
                  </span>
                </div>
              </div>

              {/* 目标日期 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">目标达成日期</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
                >
                  {editingGoal ? '保存修改' : '创建目标'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 目标列表 */
          <div className="space-y-8">
            {/* 进行中的目标 */}
            <div>
              <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                进行中 ({activeGoals.length})
              </h2>

              {activeGoals.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">暂无进行中的目标</p>
                  <button
                    onClick={openCreateForm}
                    className="mt-3 text-orange-500 hover:text-orange-600"
                  >
                    设置第一个目标
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {activeGoals.map(goal => (
                    <div
                      key={goal.id}
                      className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-bold">
                            {goal.player.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">
                                {goal.player.name}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                                {goal.player.group}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${skillColors[goal.skillType]}`}
                              >
                                {skillLabels[goal.skillType]}
                              </span>
                              <span className="text-sm text-gray-500">
                                当前 {goal.currentScore} → 目标 {goal.targetScore}
                              </span>
                            </div>

                            {/* 进度条 */}
                            <div className="w-64 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-orange-400 to-yellow-400 transition-all duration-500"
                                style={{ width: `${getProgress(goal)}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {getProgress(goal)}% 达成
                            </div>
                          </div>
                        </div>

                        {/* 操作 */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateStatus(goal, 'achieved')}
                            className="p-2 hover:bg-green-50 rounded-lg text-green-600"
                            title="标记达成"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => openEditForm(goal)}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
                            title="编辑"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(goal)}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-400"
                            title="删除"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* 目标日期 */}
                      {goal.targetDate && (
                        <div className="mt-3 text-xs text-gray-500">
                          目标日期: {new Date(goal.targetDate).toLocaleDateString('zh-CN')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 已达成的目标 */}
            {achievedGoals.length > 0 && (
              <div>
                <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-500" />
                  已达成 ({achievedGoals.length})
                </h2>

                <div className="grid gap-3">
                  {achievedGoals.map(goal => (
                    <div
                      key={goal.id}
                      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 opacity-75"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{goal.player.name}</div>
                            <div className="text-xs text-gray-500">
                              {skillLabels[goal.skillType]} · 达成 {goal.targetScore} 分
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteGoal(goal)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
