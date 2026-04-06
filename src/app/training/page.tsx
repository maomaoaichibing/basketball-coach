'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Users, CheckCircle, Clock, ClipboardList } from 'lucide-react';
import { fetchWithAuth } from '@/lib/auth';

// 类型定义
type TrainingPlan = {
  id: string;
  title: string;
  date: string;
  duration: number;
  group: string;
  location: string;
  theme?: string;
};

type Player = {
  id: string;
  name: string;
  group: string;
};

type AttendanceRecord = {
  playerId: string;
  attendance: 'present' | 'absent' | 'late';
  performance?: number;
  effort?: number;
  attitude?: number;
  feedback?: string;
};

export default function TrainingSessionPage() {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchPlayers();
  }, []);

  async function fetchPlans() {
    try {
      const response = await fetchWithAuth('/api/plans');
      const data = await response.json();
      if (data.success) {
        const parsedPlans = data.plans.map(
          (plan: TrainingPlan & { focusSkills?: string; sections?: string }) => ({
            ...plan,
            focusSkills: plan.focusSkills ? JSON.parse(plan.focusSkills) : [],
            sections: plan.sections ? JSON.parse(plan.sections) : [],
          })
        );
        setPlans(parsedPlans);
      }
    } catch (error) {
      console.error('获取教案失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPlayers() {
    try {
      const response = await fetchWithAuth('/api/players');
      const data = await response.json();
      if (data.success) {
        setPlayers(data.players);
        // 默认选中第一个分组
        if (data.players.length > 0) {
          const groups = Array.from(new Set(data.players.map((p: Player) => p.group))) as string[];
          setSelectedGroup(groups[0] || '');
        }
      }
    } catch (error) {
      console.error('获取学员失败:', error);
    }
  }

  const groups = Array.from(new Set(players.map(p => p.group))).sort();
  const filteredPlayers = selectedGroup ? players.filter(p => p.group === selectedGroup) : players;

  function handleAttendanceChange(playerId: string, status: 'present' | 'absent' | 'late') {
    setAttendance(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        playerId,
        attendance: status,
      },
    }));
  }

  async function handleSubmit() {
    if (!selectedPlan) return;

    setSubmitting(true);
    try {
      const records = Object.values(attendance);
      if (records.length === 0) {
        alert('请至少选择一个学员');
        return;
      }

      // 为每个签到学员创建训练记录
      for (const record of records) {
        await fetchWithAuth('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: selectedPlan.id,
            playerId: record.playerId,
            attendance: record.attendance,
            performance: record.performance,
            effort: record.effort,
            attitude: record.attitude,
            feedback: record.feedback,
            coachName: '教练',
          }),
        });
      }

      setSubmitted(true);
    } catch (error) {
      alert('提交失败');
    } finally {
      setSubmitting(false);
    }
  }

  const presentCount = Object.values(attendance).filter(r => r.attendance === 'present').length;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">训练记录已保存</h2>
          <p className="text-gray-500 mb-6">已为 {presentCount} 名学员创建训练记录</p>
          <div className="flex gap-3">
            <Link
              href="/feedback"
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-semibold text-center"
            >
              查看课后反馈
            </Link>
            <Link
              href="/"
              className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold text-center"
            >
              返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">训练执行</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：教案选择 */}
            <div className="lg:col-span-1">
              <h2 className="font-semibold text-gray-700 mb-4">选择教案</h2>
              {plans.length === 0 ? (
                <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
                  <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-3">暂无教案</p>
                  <Link href="/plan/new" className="text-orange-500 hover:underline text-sm">
                    去生成教案
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {plans.slice(0, 10).map(plan => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        selectedPlan?.id === plan.id
                          ? 'bg-orange-50 border-2 border-orange-500'
                          : 'bg-white border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{plan.title}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {new Date(plan.date).toLocaleDateString()} · {plan.duration}分钟
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                          {plan.group}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 右侧：签到 */}
            <div className="lg:col-span-2">
              {selectedPlan ? (
                <div className="space-y-6">
                  {/* 已选教案 */}
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Play className="w-5 h-5" />
                      <span className="text-orange-100 text-sm">当前训练</span>
                    </div>
                    <h2 className="text-xl font-bold mb-1">{selectedPlan.title}</h2>
                    <div className="flex items-center gap-4 text-orange-100 text-sm">
                      <span>{new Date(selectedPlan.date).toLocaleDateString()}</span>
                      <span>{selectedPlan.duration}分钟</span>
                      <span>{selectedPlan.location}</span>
                    </div>
                  </div>

                  {/* 分组筛选 */}
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-700">学员签到</h2>
                    <div className="flex gap-2">
                      {groups.map(group => (
                        <button
                          key={group}
                          onClick={() => setSelectedGroup(group)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            selectedGroup === group
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {group}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 学员列表 */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-gray-700">
                        已签到: <span className="font-bold text-orange-600">{presentCount}</span> /{' '}
                        {filteredPlayers.length}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {filteredPlayers.map(player => {
                        const record = attendance[player.id];
                        return (
                          <div key={player.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-bold">
                                {player.name.charAt(0)}
                              </div>
                              <span className="font-medium text-gray-900">{player.name}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAttendanceChange(player.id, 'present')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  record?.attendance === 'present'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                                }`}
                              >
                                出勤
                              </button>
                              <button
                                onClick={() => handleAttendanceChange(player.id, 'late')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  record?.attendance === 'late'
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                                }`}
                              >
                                迟到
                              </button>
                              <button
                                onClick={() => handleAttendanceChange(player.id, 'absent')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  record?.attendance === 'absent'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                                }`}
                              >
                                缺勤
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 提交按钮 */}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || Object.keys(attendance).length === 0}
                    className="w-full py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        保存中...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        完成训练记录
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
                  <Play className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">选择教案开始训练</h3>
                  <p className="text-gray-500">请从左侧选择一个教案，然后进行签到</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
