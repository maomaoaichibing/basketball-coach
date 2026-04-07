'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/auth';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Calendar,
  Save,
  RefreshCw,
} from 'lucide-react';

// 类型定义
type Plan = {
  id: string;
  title: string;
  date: string;
  group: string;
  theme?: string;
  duration: number;
  status?: string;
};

type Player = {
  id: string;
  name: string;
  group: string;
  parentPhone: string;
};

type CheckinRecord = {
  playerId: string;
  player: Player;
  attendance: string;
  signInTime?: string;
};

const attendanceOptions = [
  {
    value: 'present',
    label: '出勤',
    icon: CheckCircle,
    color: 'bg-green-500',
    textColor: 'text-green-600',
  },
  {
    value: 'absent',
    label: '缺勤',
    icon: XCircle,
    color: 'bg-red-500',
    textColor: 'text-red-600',
  },
  {
    value: 'late',
    label: '迟到',
    icon: Clock,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600',
  },
];

export default function CheckinPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [records, setRecords] = useState<Record<string, CheckinRecord>>({});
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 临时记录（未保存的更改）
  const [tempRecords, setTempRecords] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPlans();
    fetchPlayers();
  }, []);

  async function fetchPlans() {
    try {
      const response = await fetchWithAuth('/api/plans?limit=20');
      const data = await response.json();
      if (data.success) {
        // 只显示已发布的
        setPlans(data.plans.filter((p: Plan) => !p.status || p.status === 'published'));
      }
    } catch (error) {
      console.error('获取教案失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPlayers() {
    try {
      const response = await fetchWithAuth('/api/players?status=training');
      const data = await response.json();
      if (data.success) {
        setPlayers(data.players);
      }
    } catch (error) {
      console.error('获取学员失败:', error);
    }
  }

  async function selectPlan(plan: Plan) {
    setSelectedPlan(plan);
    setTempRecords({});

    // 获取已有的签到记录
    try {
      const response = await fetchWithAuth(`/api/checkin?planId=${plan.id}`);
      const data = await response.json();
      if (data.success && data.records) {
        const recordMap: Record<string, CheckinRecord> = {};
        data.records.forEach((r: CheckinRecord) => {
          recordMap[r.playerId] = r;
        });
        setRecords(recordMap);
        // 初始化临时记录
        const temp: Record<string, string> = {};
        data.records.forEach((r: CheckinRecord) => {
          temp[r.playerId] = r.attendance;
        });
        setTempRecords(temp);
      } else {
        setRecords({});
        // 全部设为出勤
        const temp: Record<string, string> = {};
        players.forEach((p) => {
          temp[p.id] = 'present';
        });
        setTempRecords(temp);
      }
    } catch (error) {
      console.error('获取签到记录失败:', error);
    }
  }

  function handleAttendance(playerId: string, attendance: string) {
    setTempRecords((prev) => ({
      ...prev,
      [playerId]: attendance,
    }));
  }

  async function handleSave() {
    if (!selectedPlan) return;

    setSaving(true);
    try {
      const recordsList = players.map((player) => ({
        playerId: player.id,
        attendance: tempRecords[player.id] || 'present',
      }));

      const response = await fetchWithAuth('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          records: recordsList,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('签到保存成功！');
        selectPlan(selectedPlan); // 刷新
      } else {
        alert('保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  }

  function markAllPresent() {
    const temp: Record<string, string> = {};
    players.forEach((p) => {
      temp[p.id] = 'present';
    });
    setTempRecords(temp);
  }

  function getAttendanceCount(type: string) {
    return Object.values(tempRecords).filter((v) => v === type).length;
  }

  // 按班级分组学员
  const groupedPlayers = players.reduce(
    (acc, player) => {
      if (!acc[player.group]) acc[player.group] = [];
      acc[player.group].push(player);
      return acc;
    },
    {} as Record<string, Player[]>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
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
                <h1 className="text-xl font-bold text-gray-900">签到点名</h1>
                <p className="text-sm text-gray-500">
                  {selectedPlan ? `已选: ${selectedPlan.title}` : '请选择训练课程'}
                </p>
              </div>
            </div>
            {selectedPlan && (
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllPresent}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  全部出勤
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  保存签到
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* 统计卡片 */}
        {selectedPlan && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {attendanceOptions.map((option) => {
              const count = getAttendanceCount(option.value);
              const Icon = option.icon;
              return (
                <div
                  key={option.value}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full ${option.color} flex items-center justify-center`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{count}</div>
                      <div className="text-sm text-gray-500">{option.label}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 课程选择 */}
        {!selectedPlan ? (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">选择训练课程</h2>
            {plans.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无训练课程</p>
                <Link
                  href="/plan/new"
                  className="text-orange-500 hover:text-orange-600 mt-2 inline-block"
                >
                  创建教案
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => selectPlan(plan)}
                    className="p-4 text-left rounded-xl border-2 border-gray-200 hover:border-orange-500 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{plan.title}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(plan.date).toLocaleDateString('zh-CN')}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                        {plan.group}
                      </span>
                      {plan.theme && <span className="text-xs text-gray-500">{plan.theme}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* 学员签到列表 */
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedPlan.title}</h2>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedPlan.date).toLocaleDateString('zh-CN', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}{' '}
                    · {selectedPlan.duration}分钟
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="text-sm text-orange-500 hover:text-orange-600"
                >
                  重新选择课程
                </button>
              </div>

              {players.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>暂无学员</p>
                  <Link
                    href="/players"
                    className="text-orange-500 hover:text-orange-600 mt-2 inline-block"
                  >
                    去添加学员
                  </Link>
                </div>
              ) : (
                Object.entries(groupedPlayers).map(([group, groupPlayers]) => (
                  <div key={group} className="mb-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {group} ({groupPlayers.length}人)
                    </h3>
                    <div className="grid gap-3">
                      {groupPlayers.map((player) => {
                        const currentAttendance = tempRecords[player.id] || 'present';
                        const existingRecord = records[player.id];

                        return (
                          <div
                            key={player.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-bold">
                                {player.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{player.name}</div>
                                {player.parentPhone && (
                                  <div className="text-xs text-gray-500">{player.parentPhone}</div>
                                )}
                              </div>
                            </div>

                            {/* 出勤状态 */}
                            <div className="flex items-center gap-2">
                              {attendanceOptions.map((option) => {
                                const Icon = option.icon;
                                const isSelected = currentAttendance === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    onClick={() => handleAttendance(player.id, option.value)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                      isSelected
                                        ? `${option.color} text-white`
                                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                                  >
                                    <Icon className="w-4 h-4" />
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
