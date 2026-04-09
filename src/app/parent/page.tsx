'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  TrendingUp,
  Calendar,
  Target,
  Clock,
  AlertCircle,
  User,
  GraduationCap,
} from 'lucide-react';

// 类型定义
type Player = {
  id: string;
  name: string;
  group: string;
  school?: string;
  team?: { name: string; coachName: string };
  guardians: { name: string; relation: string }[];
  dribbling: number;
  passing: number;
  shooting: number;
  defending: number;
  physical: number;
  tactical: number;
  records: TrainingRecord[];
  latestAssessment: PlayerAssessment | null;
  activeGoals: PlayerGoal[];
  enrollments: CourseEnrollment[];
};

// 训练记录类型
interface TrainingRecord {
  id: string;
  playerId: string;
  playerName: string;
  type: string;
  content: string;
  rating?: number;
  feedback?: string;
  attendance: string;
  createdAt: string;
  plan?: { title: string; date: string; duration: number };
  recordedAt?: string;
}

// 评估记录类型
interface PlayerAssessment {
  id: string;
  playerId: string;
  playerName: string;
  assessedAt: string;
  dribbling: number;
  passing: number;
  shooting: number;
  defending: number;
  physical: number;
  tactical: number;
  overallRating?: number;
  notes?: string;
  createdAt: string;
}

// 阶段目标类型
interface PlayerGoal {
  id: string;
  playerId: string;
  skillType: string;
  targetScore: number;
  currentScore: number;
  status: string;
  targetDate?: string;
  achievedAt?: string;
  createdAt: string;
}

// 课程报名类型
interface CourseEnrollment {
  id: string;
  playerId: string;
  courseId: string;
  courseName: string;
  startDate: string;
  endDate: string;
  status: string;
  remainingHours: number;
  totalHours: number;
  createdAt: string;
}

export default function ParentPage() {
  const [phone, setPhone] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  async function handleSearch() {
    if (!phone.trim()) {
      alert('请输入手机号');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const response = await fetch(`/api/parent?phone=${encodeURIComponent(phone)}`);
      const data = await response.json();
      if (data.success) {
        setPlayers(data.players);
        if (data.players.length > 0) {
          setSelectedPlayer(data.players[0]);
        } else {
          setSelectedPlayer(null);
        }
      } else {
        alert(data.error);
      }
    } catch {
      alert('查询失败');
    } finally {
      setLoading(false);
    }
  }

  function getAttendanceStats(records: TrainingRecord[]) {
    const total = records.length;
    const present = records.filter((r) => r.attendance === 'present').length;
    const late = records.filter((r) => r.attendance === 'late').length;
    const absent = records.filter((r) => r.attendance === 'absent').length;
    return { total, present, late, absent };
  }

  function AttendanceBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; color: string }> = {
      present: { label: '出勤', color: 'bg-green-100 text-green-700' },
      late: { label: '迟到', color: 'bg-yellow-100 text-yellow-700' },
      absent: { label: '缺勤', color: 'bg-red-100 text-red-700' },
    };
    const { label, color } = config[status] || {
      label: status,
      color: 'bg-gray-100 text-gray-700',
    };
    return <span className={`px-2 py-0.5 text-xs rounded-full ${color}`}>{label}</span>;
  }

  if (!searched) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold text-gray-900">家长端</h1>
            <p className="text-gray-500 mt-1">查看孩子的训练情况</p>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-10 h-10 text-orange-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">登录家长端</h2>
              <p className="text-gray-500 mt-1">请输入注册时绑定的手机号</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">手机号</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="请输入手机号"
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        查询
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500">
                <p>手机号为您在报名时登记的家长手机号码</p>
                <p className="mt-1">如有疑问请联系教练</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-xl mx-auto px-4 py-6">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900">家长端</h1>
            </div>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-100">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">未找到关联学员</h2>
            <p className="text-gray-500 mb-6">该手机号未关联任何学员信息</p>
            <button
              onClick={() => {
                setSearched(false);
                setPhone('');
              }}
              className="px-6 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600"
            >
              重新输入
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900">家长端</h1>
            </div>
            <button
              onClick={() => {
                setSearched(false);
                setPlayers([]);
                setSelectedPlayer(null);
              }}
              className="text-sm text-orange-500 hover:text-orange-600"
            >
              切换账号
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：学员列表 */}
          <div className="lg:col-span-1">
            <h2 className="font-semibold text-gray-700 mb-4">我的孩子</h2>
            <div className="space-y-2">
              {players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    selectedPlayer?.id === player.id
                      ? 'bg-orange-50 border-2 border-orange-500'
                      : 'bg-white border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-bold text-lg">
                      {player.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{player.name}</div>
                      <div className="text-sm text-gray-500">{player.group}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 右侧：详细信息 */}
          <div className="lg:col-span-2">
            {selectedPlayer && (
              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-bold text-2xl">
                        {selectedPlayer.name.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{selectedPlayer.name}</h2>
                        <p className="text-gray-500">
                          {selectedPlayer.group} · {selectedPlayer.school || '未填写学校'}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                      {selectedPlayer.team?.name || '未分配队伍'}
                    </span>
                  </div>

                  {selectedPlayer.team?.coachName && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                      <GraduationCap className="w-4 h-4" />
                      <span>教练：{selectedPlayer.team.coachName}</span>
                    </div>
                  )}

                  {/* 剩余课时 */}
                  {selectedPlayer.enrollments.length > 0 && (
                    <div className="p-4 bg-green-50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-800">剩余课时</span>
                        </div>
                        <span className="text-2xl font-bold text-green-700">
                          {selectedPlayer.enrollments.filter((e) => e.status === 'active')[0]
                            ?.remainingHours || 0}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 能力评估 */}
                {selectedPlayer.latestAssessment && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-orange-500" />
                      能力评估
                      <span className="text-sm text-gray-500 font-normal">
                        {new Date(selectedPlayer.latestAssessment.assessedAt).toLocaleDateString()}
                      </span>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        {
                          key: 'dribbling',
                          label: '运球',
                          value: selectedPlayer.latestAssessment.dribbling,
                        },
                        {
                          key: 'passing',
                          label: '传球',
                          value: selectedPlayer.latestAssessment.passing,
                        },
                        {
                          key: 'shooting',
                          label: '投篮',
                          value: selectedPlayer.latestAssessment.shooting,
                        },
                        {
                          key: 'defending',
                          label: '防守',
                          value: selectedPlayer.latestAssessment.defending,
                        },
                        {
                          key: 'physical',
                          label: '体能',
                          value: selectedPlayer.latestAssessment.physical,
                        },
                        {
                          key: 'tactical',
                          label: '战术',
                          value: selectedPlayer.latestAssessment.tactical,
                        },
                      ].map((item) => (
                        <div key={item.key} className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {item.value || '-'}
                          </div>
                          <div className="text-sm text-gray-500">{item.label}</div>
                          <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full transition-all"
                              style={{
                                width: `${((item.value || 0) / 10) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedPlayer.latestAssessment.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                        {selectedPlayer.latestAssessment.notes}
                      </div>
                    )}
                  </div>
                )}

                {/* 阶段目标 */}
                {selectedPlayer.activeGoals.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-orange-500" />
                      进行中的目标
                    </h3>
                    <div className="space-y-3">
                      {selectedPlayer.activeGoals.map((goal: PlayerGoal) => {
                        const skillLabels: Record<string, string> = {
                          dribbling: '运球',
                          passing: '传球',
                          shooting: '投篮',
                          defending: '防守',
                          physical: '体能',
                          tactical: '战术',
                        };
                        const progress = Math.min(
                          100,
                          Math.round((goal.currentScore / goal.targetScore) * 100)
                        );
                        return (
                          <div key={goal.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-gray-800">
                                {skillLabels[goal.skillType] || goal.skillType}
                              </span>
                              <span className="text-sm text-gray-500">
                                {goal.currentScore} / {goal.targetScore}
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  progress >= 100 ? 'bg-green-500' : 'bg-orange-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 出勤统计 */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-500" />
                    最近训练 ({selectedPlayer.records.length}次)
                  </h3>
                  {selectedPlayer.records.length > 0 ? (
                    <div className="space-y-3">
                      {(() => {
                        const stats = getAttendanceStats(selectedPlayer.records);
                        return (
                          <div className="grid grid-cols-4 gap-2 mb-4">
                            <div className="text-center p-2 bg-green-50 rounded-lg">
                              <div className="text-lg font-bold text-green-600">
                                {stats.present}
                              </div>
                              <div className="text-xs text-green-600">出勤</div>
                            </div>
                            <div className="text-center p-2 bg-yellow-50 rounded-lg">
                              <div className="text-lg font-bold text-yellow-600">{stats.late}</div>
                              <div className="text-xs text-yellow-600">迟到</div>
                            </div>
                            <div className="text-center p-2 bg-red-50 rounded-lg">
                              <div className="text-lg font-bold text-red-600">{stats.absent}</div>
                              <div className="text-xs text-red-600">缺勤</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                              <div className="text-lg font-bold text-gray-600">{stats.total}</div>
                              <div className="text-xs text-gray-600">总计</div>
                            </div>
                          </div>
                        );
                      })()}

                      {selectedPlayer.records.map((record: TrainingRecord) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              {record.plan?.title || '训练课'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(
                                record.plan?.date || record.recordedAt || new Date()
                              ).toLocaleDateString()}{' '}
                              · {record.plan?.duration || 0}分钟
                            </div>
                          </div>
                          <AttendanceBadge status={record.attendance} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p>暂无训练记录</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
