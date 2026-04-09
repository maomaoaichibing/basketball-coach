'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { fetchWithAuth } from '@/lib/auth';
import {
  ArrowLeft,
  Play,
  Users,
  CheckCircle,
  Clock,
  ClipboardList,
  UserCheck,
  UserX,
  AlertCircle,
  Save,
  MessageSquare,
  Star,
  CheckCircle2,
} from 'lucide-react';

// 类型定义
type TrainingPlan = {
  id: string;
  title: string;
  date: string;
  duration: number;
  group: string;
  location: string;
  theme?: string;
  playerIds?: string;
  generatedBy?: string;
};

type PlayerDetail = {
  id: string;
  name: string;
  group: string;
};

type TrainingRecord = {
  id: string;
  playerId: string | null;
  player: { id: string; name: string; group: string } | null;
  attendance: string;
  signInTime: string | null;
  performance: number | null;
  effort: number | null;
  attitude: number | null;
  feedback: string | null;
  highlights: string | null;
  issues: string | null;
};

// 训练执行页面内容（需要 useSearchParams 的部分）
function TrainingSessionContent() {
  const searchParams = useSearchParams();
  const autoPlanId = searchParams.get('planId');

  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [playerDetails, setPlayerDetails] = useState<PlayerDetail[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 训练记录的本地编辑状态（key: playerId）
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent' | 'late'>>(
    {}
  );
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [performanceMap, setPerformanceMap] = useState<Record<string, number>>({});
  const [showFeedbackInput, setShowFeedbackInput] = useState<string | null>(null);
  const [planSections, setPlanSections] = useState<
    Array<{
      category: string;
      name: string;
      duration: number;
      activities: Array<{ name: string; duration: number }>;
    }>
  >([]);

  const [trainingStatus, setTrainingStatus] = useState<'idle' | 'active' | 'completed'>('idle');
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchPlans();
  }, []);

  // 自动加载 URL 中指定的教案
  useEffect(() => {
    if (autoPlanId && plans.length > 0 && !selectedPlan) {
      const targetPlan = plans.find((p) => p.id === autoPlanId);
      if (targetPlan) {
        handleSelectPlan(targetPlan);
        setTrainingStatus('active');
      }
    }
  }, [autoPlanId, plans, selectedPlan]);

  async function fetchPlans() {
    try {
      const response = await fetchWithAuth('/api/plans?limit=50');
      const data = await response.json();
      if (data.success) {
        // 按日期倒序排列，带参训学员的优先
        const sortedPlans = data.plans.sort((a: TrainingPlan, b: TrainingPlan) => {
          const aHasPlayers = (() => {
            try {
              return JSON.parse(a.playerIds || '[]').length > 0;
            } catch {
              return false;
            }
          })();
          const bHasPlayers = (() => {
            try {
              return JSON.parse(b.playerIds || '[]').length > 0;
            } catch {
              return false;
            }
          })();
          if (aHasPlayers !== bHasPlayers) return bHasPlayers ? 1 : -1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        setPlans(sortedPlans);
      }
    } catch (error) {
      console.error('获取教案失败:', error);
    } finally {
      setLoading(false);
    }
  }

  // 选择教案后，加载参训学员和已有签到记录
  async function handleSelectPlan(plan: TrainingPlan) {
    setSelectedPlan(plan);

    try {
      // 获取教案详情（包含 playerDetails 和 records）
      const response = await fetchWithAuth(`/api/plans/${plan.id}`);
      const data = await response.json();

      if (data.success) {
        setPlayerDetails(data.playerDetails || []);
        setRecords(data.records || []);

        // 解析教案 sections 用于展示训练进度
        try {
          const plan = data.plan;
          const sections = plan.sections ? JSON.parse(plan.sections) : [];
          setPlanSections(sections);
        } catch {
          setPlanSections([]);
        }

        // 初始化签到状态 map
        const attMap: Record<string, 'present' | 'absent' | 'late'> = {};
        const fbMap: Record<string, string> = {};
        const perfMap: Record<string, number> = {};

        for (const record of (data.records || []) as TrainingRecord[]) {
          if (record.playerId) {
            attMap[record.playerId] = record.attendance as 'present' | 'absent' | 'late';
            if (record.feedback) fbMap[record.playerId] = record.feedback;
            if (record.performance) perfMap[record.playerId] = record.performance;
          }
        }

        // 对于没有签到记录的学员，默认设为 present
        for (const player of (data.playerDetails || []) as PlayerDetail[]) {
          if (!attMap[player.id]) {
            attMap[player.id] = 'present';
          }
        }

        setAttendanceMap(attMap);
        setFeedbackMap(fbMap);
        setPerformanceMap(perfMap);
      }
    } catch (error) {
      console.error('获取教案详情失败:', error);
    }
  }

  function handleAttendanceChange(playerId: string, status: 'present' | 'absent' | 'late') {
    setAttendanceMap((prev) => ({ ...prev, [playerId]: status }));
  }

  function handlePerformanceChange(playerId: string, score: number) {
    setPerformanceMap((prev) => ({ ...prev, [playerId]: score }));
  }

  function handleFeedbackChange(playerId: string, feedback: string) {
    setFeedbackMap((prev) => ({ ...prev, [playerId]: feedback }));
  }

  // 保存签到记录
  async function handleSave() {
    if (!selectedPlan) return;

    setSubmitting(true);
    try {
      const playerIds = playerDetails.map((p) => p.id);
      const updatedCount = Object.keys(attendanceMap).length;

      // 批量更新签到记录（PATCH 单个记录）
      for (const playerId of playerIds) {
        const existingRecord = records.find((r) => r.playerId === playerId);
        const attendance = attendanceMap[playerId] || 'present';
        const feedback = feedbackMap[playerId] || null;
        const performance = performanceMap[playerId] || null;

        if (existingRecord) {
          // 更新已有记录
          await fetchWithAuth(`/api/records/${existingRecord.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              attendance,
              feedback,
              performance,
            }),
          });
        } else {
          // 创建新记录（理论上 Phase A 已创建，这里是兜底）
          await fetchWithAuth('/api/records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planId: selectedPlan.id,
              playerId,
              attendance,
              feedback,
              performance,
            }),
          });
        }
      }

      // 刷新记录
      await handleSelectPlan(selectedPlan);
      alert(`已保存 ${updatedCount} 名学员的训练记录`);
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  // 标记环节完成
  function toggleSectionComplete(index: number) {
    setCompletedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  // 结束训练
  function handleEndTraining() {
    setTrainingStatus('completed');
    // 自动保存
    if (selectedPlan && playerDetails.length > 0) {
      handleSave();
    }
  }
  const presentCount = Object.values(attendanceMap).filter((v) => v === 'present').length;
  const lateCount = Object.values(attendanceMap).filter((v) => v === 'late').length;
  const absentCount = Object.values(attendanceMap).filter((v) => v === 'absent').length;
  const totalPlayerCount = playerDetails.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
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
              <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {plans.slice(0, 20).map((plan) => {
                  const hasPlayers = (() => {
                    try {
                      return JSON.parse(plan.playerIds || '[]').length > 0;
                    } catch {
                      return false;
                    }
                  })();
                  return (
                    <button
                      key={plan.id}
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        selectedPlan?.id === plan.id
                          ? 'bg-orange-50 border-2 border-orange-500'
                          : 'bg-white border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{plan.title}</div>
                          <div className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                            <span>{new Date(plan.date).toLocaleDateString()}</span>
                            <span>{plan.duration}分钟</span>
                            {hasPlayers && (
                              <span className="flex items-center gap-0.5 text-green-600">
                                <Users className="w-3 h-3" />
                                {(() => {
                                  try {
                                    return JSON.parse(plan.playerIds || '[]').length;
                                  } catch {
                                    return 0;
                                  }
                                })()}
                                人
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full ml-2 shrink-0">
                          {plan.group}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 右侧：签到管理 */}
          <div className="lg:col-span-2">
            {selectedPlan ? (
              <div className="space-y-6">
                {/* 已选教案 + 训练状态 */}
                <div
                  className={`rounded-xl p-6 text-white ${trainingStatus === 'completed' ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {trainingStatus === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                      <span className="text-sm opacity-80">
                        {trainingStatus === 'completed'
                          ? '训练已完成'
                          : trainingStatus === 'active'
                            ? '训练进行中'
                            : '当前训练'}
                      </span>
                    </div>
                    {trainingStatus === 'active' && (
                      <button
                        onClick={handleEndTraining}
                        className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors"
                      >
                        结束训练
                      </button>
                    )}
                    {trainingStatus === 'completed' && (
                      <Link
                        href={`/plans/${selectedPlan.id}`}
                        className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors"
                      >
                        查看教案
                      </Link>
                    )}
                  </div>
                  <h2 className="text-xl font-bold mb-1">{selectedPlan.title}</h2>
                  <div className="flex items-center gap-4 text-sm opacity-80 flex-wrap">
                    <span>{new Date(selectedPlan.date).toLocaleDateString()}</span>
                    <span>{selectedPlan.duration}分钟</span>
                    <span>{selectedPlan.location}</span>
                  </div>
                </div>

                {totalPlayerCount === 0 ? (
                  /* 无参训学员 */
                  <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      该教案未选择参训学员
                    </h3>
                    <p className="text-gray-500 mb-4">保存教案时选择学员可自动创建签到记录</p>
                    <Link
                      href={`/plans/${selectedPlan.id}`}
                      className="text-orange-600 hover:text-orange-700 font-medium"
                    >
                      查看教案详情
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* 签到统计 */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                          <UserCheck className="w-4 h-4" />
                          <span className="text-sm font-medium">出勤</span>
                        </div>
                        <div className="text-2xl font-bold text-green-700">{presentCount}</div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">迟到</span>
                        </div>
                        <div className="text-2xl font-bold text-amber-700">{lateCount}</div>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                          <UserX className="w-4 h-4" />
                          <span className="text-sm font-medium">缺勤</span>
                        </div>
                        <div className="text-2xl font-bold text-red-700">{absentCount}</div>
                      </div>
                    </div>

                    {/* 学员列表 */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-700">学员签到</h2>
                        <span className="text-sm text-gray-500">共 {totalPlayerCount} 人</span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {playerDetails.map((player, _idx) => {
                          const attendance = attendanceMap[player.id] || 'present';
                          const feedback = feedbackMap[player.id] || '';
                          const performance = performanceMap[player.id] || 0;
                          const isExpanded = showFeedbackInput === player.id;

                          return (
                            <div key={player.id} className="hover:bg-gray-50 transition-colors">
                              <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-bold text-sm">
                                    {player.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">{player.name}</div>
                                    <div className="text-xs text-gray-400">{player.group}</div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* 签到按钮 */}
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleAttendanceChange(player.id, 'present')}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        attendance === 'present'
                                          ? 'bg-green-500 text-white'
                                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                                      }`}
                                    >
                                      到
                                    </button>
                                    <button
                                      onClick={() => handleAttendanceChange(player.id, 'late')}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        attendance === 'late'
                                          ? 'bg-yellow-500 text-white'
                                          : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                                      }`}
                                    >
                                      迟
                                    </button>
                                    <button
                                      onClick={() => handleAttendanceChange(player.id, 'absent')}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        attendance === 'absent'
                                          ? 'bg-red-500 text-white'
                                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                                      }`}
                                    >
                                      缺
                                    </button>
                                  </div>

                                  {/* 评价和反馈按钮 */}
                                  <button
                                    onClick={() =>
                                      setShowFeedbackInput(isExpanded ? null : player.id)
                                    }
                                    className={`p-2 rounded-lg transition-colors ${
                                      isExpanded
                                        ? 'bg-orange-100 text-orange-600'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                    title="训练反馈"
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* 展开的反馈区域 */}
                              {isExpanded && (
                                <div className="px-4 pb-4 pl-17 space-y-3">
                                  {/* 表现评分 */}
                                  <div>
                                    <label className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                                      <Star className="w-3 h-3 text-amber-500" />
                                      表现评分 (1-10)
                                    </label>
                                    <div className="flex items-center gap-1 mt-1">
                                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                                        <button
                                          key={score}
                                          onClick={() => handlePerformanceChange(player.id, score)}
                                          className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                                            performance >= score
                                              ? 'bg-amber-400 text-white'
                                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                          }`}
                                        >
                                          {score}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* 文字反馈 */}
                                  <div>
                                    <label className="text-sm text-gray-600 mb-1">训练反馈</label>
                                    <textarea
                                      value={feedback}
                                      onChange={(e) =>
                                        handleFeedbackChange(player.id, e.target.value)
                                      }
                                      placeholder="输入对学员本次训练的反馈..."
                                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                                      rows={2}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 教案环节进度 */}
                    {planSections.length > 0 && (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                          <h2 className="font-semibold text-gray-700">训练环节</h2>
                          <span className="text-sm text-gray-500">
                            {completedSections.size}/{planSections.length} 完成
                          </span>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {planSections.map((section, index) => {
                            const isDone = completedSections.has(index);
                            const sectionColorMap: Record<string, string> = {
                              warmup: 'bg-blue-100 text-blue-700',
                              ball_familiarity: 'bg-amber-100 text-amber-700',
                              technical: 'bg-orange-100 text-orange-700',
                              physical: 'bg-red-100 text-red-700',
                              tactical: 'bg-purple-100 text-purple-700',
                              game: 'bg-green-100 text-green-700',
                              cooldown: 'bg-gray-100 text-gray-700',
                              etiquette: 'bg-pink-100 text-pink-700',
                            };
                            const categoryLabel: Record<string, string> = {
                              warmup: '热身',
                              technical: '技术',
                              tactical: '战术',
                              game: '对抗',
                              cooldown: '放松',
                              etiquette: '礼仪',
                              ball_familiarity: '球性',
                              physical: '体能',
                            };

                            return (
                              <button
                                key={index}
                                onClick={() => toggleSectionComplete(index)}
                                className={`w-full p-4 flex items-center gap-3 text-left transition-colors hover:bg-gray-50 ${isDone ? 'opacity-60' : ''}`}
                              >
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isDone ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                                >
                                  {isDone ? <CheckCircle className="w-4 h-4" /> : index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div
                                    className={`font-medium ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}
                                  >
                                    {section.name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    {section.duration}分钟
                                    {section.category && (
                                      <span
                                        className={`px-1.5 py-0.5 text-xs rounded ${sectionColorMap[section.category] || 'bg-gray-100 text-gray-600'}`}
                                      >
                                        {categoryLabel[section.category] || section.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleSave}
                        disabled={submitting}
                        className="flex-1 py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            保存中...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5" />
                            保存训练记录
                          </>
                        )}
                      </button>
                      <Link
                        href={`/plans/${selectedPlan.id}`}
                        className="px-6 py-4 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 flex items-center justify-center gap-2"
                      >
                        <ClipboardList className="w-5 h-5" />
                        查看教案
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
                <Play className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">选择教案开始训练</h3>
                <p className="text-gray-500">从左侧选择一个教案，管理学员签到和训练反馈</p>
                <p className="text-sm text-gray-400 mt-2">带参训学员的教案会自动加载签到状态</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// 页面导出 - 用 Suspense 包裹以支持 useSearchParams
export default function TrainingSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      }
    >
      <TrainingSessionContent />
    </Suspense>
  );
}
