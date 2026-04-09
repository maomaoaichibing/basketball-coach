'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/auth';
import {
  ArrowLeft,
  Plus,
  ClipboardList,
  Download,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
} from 'lucide-react';

// 类型定义
type Plan = {
  id: string;
  title: string;
  date: string;
  group: string;
  theme?: string;
  duration: number;
  status: string;
};

type Player = {
  id: string;
  name: string;
  group: string;
};

type FeedbackRecord = {
  id: string;
  playerId: string;
  playerName: string;
  playerGroup: string;
  planId: string;
  planTitle: string;
  planDate: string;
  planGroup: string;
  planTheme: string;
  coachName?: string;
  attendance: string;
  performance?: number;
  effort?: number;
  attitude?: number;
  feedback?: string;
  highlights?: string;
  issues?: string;
  improvements?: string;
  homework?: string;
  coachConfirmed: boolean;
  recordedAt: string;
};

const attendanceOptions = [
  {
    value: 'present',
    label: '出勤',
    icon: CheckCircle,
    color: 'text-green-600 bg-green-50',
  },
  {
    value: 'absent',
    label: '缺勤',
    icon: XCircle,
    color: 'text-red-600 bg-red-50',
  },
  {
    value: 'late',
    label: '迟到',
    icon: AlertCircle,
    color: 'text-yellow-600 bg-yellow-50',
  },
];

export default function FeedbackPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // 表单状态
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [coachName, setCoachName] = useState('');
  const [formData, setFormData] = useState({
    attendance: 'present',
    performance: 7,
    effort: 7,
    attitude: 7,
    feedback: '',
    highlights: '',
    issues: '',
    improvements: '',
    homework: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      // 获取教案列表
      const plansRes = await fetchWithAuth('/api/plans?limit=100');
      const plansData = await plansRes.json();
      if (plansData.success) {
        // 只显示已发布的教案
        setPlans(plansData.plans.filter((p: Plan) => p.status === 'published' || !p.status));
      }

      // 获取学员列表
      const playersRes = await fetchWithAuth('/api/players?status=training');
      const playersData = await playersRes.json();
      if (playersData.success) {
        setPlayers(playersData.players);
      }

      // 获取训练记录
      const recordsRes = await fetchWithAuth('/api/records?limit=50');
      const recordsData = await recordsRes.json();
      if (recordsData.success) {
        setRecords(recordsData.records);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
  };

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPlayers.length === players.length) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(players.map((p) => p.id));
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlan) {
      alert('请选择教案');
      return;
    }

    if (selectedPlayers.length === 0) {
      alert('请选择学员');
      return;
    }

    try {
      for (const playerId of selectedPlayers) {
        await fetchWithAuth('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: selectedPlan.id,
            playerId,
            coachName,
            ...formData,
          }),
        });
      }

      alert('反馈提交成功！');
      setShowForm(false);
      setSelectedPlan(null);
      setSelectedPlayers([]);
      setFormData({
        attendance: 'present',
        performance: 7,
        effort: 7,
        attitude: 7,
        feedback: '',
        highlights: '',
        issues: '',
        improvements: '',
        homework: '',
      });
      fetchData();
    } catch (error) {
      console.error('提交失败:', error);
      alert('提交失败');
    }
  };

  const getAttendanceInfo = (attendance: string) => {
    return attendanceOptions.find((a) => a.value === attendance) || attendanceOptions[0];
  };

  // 按日期分组记录
  const groupedRecords = records.reduce(
    (acc, record) => {
      const date = record.planDate.split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(record);
      return acc;
    },
    {} as Record<string, FeedbackRecord[]>
  );

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
                <h1 className="text-xl font-bold text-gray-900">课后反馈</h1>
                <p className="text-sm text-gray-500">共 {records.length} 条反馈记录</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
            >
              <Plus className="w-4 h-4" />
              填写反馈
            </button>
            <a
              href="/api/export?type=records&format=excel"
              download
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg"
            >
              <Download className="w-4 h-4" />
              导出
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {showForm ? (
          /* 反馈表单 */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">填写课后反馈</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 选择教案 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择教案 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {plans.slice(0, 6).map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => handleSelectPlan(plan)}
                      className={`p-3 text-left rounded-lg border-2 transition-colors ${
                        selectedPlan?.id === plan.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900 text-sm">{plan.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(plan.date).toLocaleDateString('zh-CN')} · {plan.group}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 选择学员 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    选择学员 <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-orange-600 hover:text-orange-700"
                  >
                    {selectedPlayers.length === players.length ? '取消全选' : '全选'}
                  </button>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                  {players.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => handleSelectPlayer(player.id)}
                      className={`p-2 text-sm rounded-lg text-left transition-colors ${
                        selectedPlayers.includes(player.id)
                          ? 'bg-orange-500 text-white'
                          : 'bg-white hover:bg-gray-100'
                      }`}
                    >
                      {player.name}
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  已选择 {selectedPlayers.length} 名学员
                </div>
              </div>

              {/* 教练姓名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">教练姓名</label>
                <input
                  type="text"
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  placeholder="请输入教练姓名"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* 出勤 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">出勤情况</label>
                <div className="grid grid-cols-3 gap-3">
                  {attendanceOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setFormData({ ...formData, attendance: option.value })}
                        className={`p-3 flex items-center justify-center gap-2 rounded-lg border-2 transition-colors ${
                          formData.attendance === option.value
                            ? `border-current ${option.color}`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 评分 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">评分 (1-10)</label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { key: 'performance', label: '表现' },
                    { key: 'effort', label: '努力程度' },
                    { key: 'attitude', label: '态度' },
                  ].map((item) => (
                    <div key={item.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">{item.label}</span>
                        <span className="font-semibold text-orange-600">
                          {formData[item.key as keyof typeof formData]}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={formData[item.key as keyof typeof formData] as number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            [item.key]: parseInt(e.target.value),
                          })
                        }
                        className="w-full accent-orange-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 反馈内容 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">综合评价</label>
                  <textarea
                    value={formData.feedback}
                    onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                    placeholder="描述本次训练的整体情况..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">亮点</label>
                  <textarea
                    value={formData.highlights}
                    onChange={(e) => setFormData({ ...formData, highlights: e.target.value })}
                    placeholder="学员表现好的地方..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">问题</label>
                  <textarea
                    value={formData.issues}
                    onChange={(e) => setFormData({ ...formData, issues: e.target.value })}
                    placeholder="需要改进的地方..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">课后作业</label>
                  <textarea
                    value={formData.homework}
                    onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                    placeholder="布置课后练习内容..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* 提交按钮 */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  提交反馈
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 反馈列表 */
          <div className="space-y-6">
            {Object.keys(groupedRecords).length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl">
                <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无反馈记录</h3>
                <p className="text-gray-500 mb-4">点击右上角开始填写课后反馈</p>
              </div>
            ) : (
              Object.entries(groupedRecords).map(([date, dayRecords]) => (
                <div key={date}>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">
                    {new Date(date).toLocaleDateString('zh-CN', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h3>
                  <div className="space-y-3">
                    {dayRecords.map((record) => {
                      const attendance = getAttendanceInfo(record.attendance);
                      const AttendanceIcon = attendance.icon;
                      return (
                        <div
                          key={record.id}
                          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${attendance.color}`}>
                                <AttendanceIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {record.playerName}
                                  <span className="ml-2 text-sm text-gray-500">
                                    {record.playerGroup}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  {record.planTitle}
                                  {record.planTheme && ` · ${record.planTheme}`}
                                </div>
                                {record.feedback && (
                                  <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                    {record.feedback}
                                  </div>
                                )}
                                {(record.performance || record.effort || record.attitude) && (
                                  <div className="flex items-center gap-4 mt-2">
                                    {record.performance && (
                                      <div className="text-sm">
                                        <Star className="w-3 h-3 inline text-yellow-500" />
                                        <span className="ml-1">表现 {record.performance}</span>
                                      </div>
                                    )}
                                    {record.effort && (
                                      <div className="text-sm">
                                        <span className="text-gray-500">努力</span>
                                        <span className="ml-1">{record.effort}</span>
                                      </div>
                                    )}
                                    {record.attitude && (
                                      <div className="text-sm">
                                        <span className="text-gray-500">态度</span>
                                        <span className="ml-1">{record.attitude}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-xs text-gray-400">
                              {record.coachName && <div>{record.coachName}</div>}
                              {new Date(record.recordedAt).toLocaleTimeString('zh-CN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
