'use client';

import { useState, useEffect, ComponentType } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/auth';
import { ChevronRight, Plus, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type Leave = {
  id: string;
  playerId: string;
  playerName: string;
  leaveType: string;
  reason: string;
  dates: string[];
  totalHours: number;
  status: string;
  reply: string;
  createdAt: string;
};

type Player = {
  id: string;
  name: string;
  group: string;
};

export default function ParentLeavePage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [createForm, setCreateForm] = useState({
    leaveType: 'absence',
    reason: '',
    dates: [] as string[],
    totalHours: 0,
  });

  useEffect(() => {
    const stored = localStorage.getItem('parentPlayer');
    if (stored) {
      const playerData = JSON.parse(stored);
      setPlayer(playerData);
      fetchLeaves(playerData.id);
    } else {
      router.push('/parent');
    }
  }, [router]);

  async function fetchLeaves(playerId: string) {
    try {
      const response = await fetchWithAuth(`/api/leaves?playerId=${playerId}`);
      const data = await response.json();
      if (data.success) {
        setLeaves(data.leaves);
      }
    } catch (error) {
      console.error('获取请假记录失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateLeave() {
    if (!player || createForm.dates.length === 0) return;

    try {
      const response = await fetchWithAuth('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          playerName: player.name,
          guardianId: localStorage.getItem('guardianId') || '',
          guardianName: localStorage.getItem('guardianName') || '',
          leaveType: createForm.leaveType,
          reason: createForm.reason,
          dates: JSON.stringify(createForm.dates),
          totalHours: createForm.totalHours,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        setCreateForm({
          leaveType: 'absence',
          reason: '',
          dates: [],
          totalHours: 0,
        });
        fetchLeaves(player.id);
      }
    } catch (error) {
      console.error('创建请假失败:', error);
    }
  }

  function addDate() {
    const newDate = prompt('请输入请假日期 (格式: 2024-03-20)');
    if (newDate && !createForm.dates.includes(newDate)) {
      setCreateForm({
        ...createForm,
        dates: [...createForm.dates, newDate],
      });
    }
  }

  const statusConfig: Record<
    string,
    { color: string; icon: ComponentType<{ className?: string }>; label: string }
  > = {
    pending: {
      color: 'bg-yellow-100 text-yellow-700',
      icon: AlertCircle,
      label: '待审批',
    },
    approved: {
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle,
      label: '已批准',
    },
    rejected: {
      color: 'bg-red-100 text-red-700',
      icon: XCircle,
      label: '已拒绝',
    },
    cancelled: {
      color: 'bg-gray-100 text-gray-700',
      icon: XCircle,
      label: '已取消',
    },
  };

  const leaveTypeLabels: Record<string, string> = {
    absence: '请假',
    late: '迟到',
    early: '早退',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/parent" className="text-gray-400 hover:text-gray-600">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </Link>
              <div className="flex items-center gap-2">
                <Calendar className="w-6 h-6 text-orange-500" />
                <h1 className="text-xl font-bold text-gray-900">请假申请</h1>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              请假
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 请假说明 */}
        <div className="bg-orange-50 rounded-xl p-4 mb-6 border border-orange-100">
          <h3 className="font-medium text-orange-800 mb-2">请假须知</h3>
          <ul className="text-sm text-orange-700 space-y-1">
            <li>• 请提前1天提交请假申请</li>
            <li>• 紧急情况可联系教练或管理员</li>
            <li>• 连续请假超过3天需提供证明</li>
          </ul>
        </div>

        {/* 请假记录 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : leaves.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无请假记录</h3>
            <p className="text-gray-500 mb-4">如有需要，请提前提交请假申请</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-orange-600 hover:text-orange-700"
            >
              提交请假 →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {leaves.map((leave) => {
              const config = statusConfig[leave.status] || statusConfig.pending;
              const StatusIcon = config.icon;

              return (
                <div
                  key={leave.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${config.color} flex items-center gap-1`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {leaveTypeLabels[leave.leaveType]}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(leave.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>

                    {/* 请假日期 */}
                    <div className="mb-3">
                      <div className="text-sm text-gray-500 mb-1">请假日期</div>
                      <div className="flex flex-wrap gap-2">
                        {leave.dates.map((date, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-orange-50 text-orange-700 text-sm rounded-lg"
                          >
                            {date}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 请假原因 */}
                    {leave.reason && (
                      <div className="mb-3">
                        <div className="text-sm text-gray-500 mb-1">请假原因</div>
                        <p className="text-gray-700">{leave.reason}</p>
                      </div>
                    )}

                    {/* 审批回复 */}
                    {leave.reply && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm text-gray-500 mb-1">审批回复</div>
                        <p className="text-gray-700">{leave.reply}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 创建请假弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">提交请假申请</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">请假类型</label>
                <select
                  value={createForm.leaveType}
                  onChange={(e) => setCreateForm({ ...createForm, leaveType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="absence">请假</option>
                  <option value="late">迟到</option>
                  <option value="early">早退</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">请假日期</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {createForm.dates.map((date, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-lg flex items-center gap-1"
                    >
                      {date}
                      <button
                        onClick={() =>
                          setCreateForm({
                            ...createForm,
                            dates: createForm.dates.filter((_, i) => i !== index),
                          })
                        }
                        className="text-orange-500 hover:text-orange-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <button
                  onClick={addDate}
                  className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-orange-500 hover:text-orange-500 transition-colors"
                >
                  + 添加日期
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">请假原因</label>
                <textarea
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  placeholder="请输入请假原因..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="bg-yellow-50 rounded-lg p-4 text-sm text-yellow-700">
                <p>请确保请假信息真实有效，提交后等待教练或管理员审批。</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateLeave}
                  disabled={createForm.dates.length === 0}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  提交申请
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
