'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/auth';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Users,
  Target,
  Play,
  CheckCircle2,
  Download,
  Edit,
  Sparkles,
  Copy,
  UserCheck,
  UserX,
  AlertCircle,
  ClipboardList,
  Star,
  Bookmark,
  LayoutTemplate,
  Save,
} from 'lucide-react';

// 教案类型
type Section = {
  category: string;
  name: string;
  duration: number;
  activities: {
    name: string;
    duration: number;
    description: string;
    keyPoints?: string[];
    equipment?: string[];
    relatedTo?: string;
    drillDiagram?: string;
    sets?: string;
    repetitions?: string;
    progression?: string;
    coachGuide?: string;
  }[];
  points?: string[];
};

type TrainingPlan = {
  id: string;
  title: string;
  group: string;
  date: string;
  duration: number;
  location: string;
  weather?: string;
  theme?: string;
  objective?: string;
  intensity?: string;
  skillLevel?: string;
  status?: string;
  generatedBy?: string;
  sections?: Section[];
  notes?: string;
  focusSkills?: string;
  trainingProgression?: string;
  playerIds?: string;
  isFavorite?: boolean;
  isTemplate?: boolean;
};

// 学员信息
type PlayerDetail = {
  id: string;
  name: string;
  group: string;
};

// 训练记录
type TrainingRecord = {
  id: string;
  playerId: string | null;
  player: { id: string; name: string; group: string } | null;
  coachName: string | null;
  attendance: string;
  signInTime: string | null;
  performance: number | null;
  feedback: string | null;
};

export default function PlanDetailPage({ params }: { params: { id: string } }) {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [playerDetails, setPlayerDetails] = useState<PlayerDetail[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);

  const router = useRouter();

  useEffect(() => {
    fetchPlan();
  }, [params.id]);

  async function fetchPlan() {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/api/plans/${params.id}`);
      const data = await response.json();

      if (data.success) {
        const parsedPlan = {
          ...data.plan,
          sections: data.plan.sections ? JSON.parse(data.plan.sections) : [],
        };
        setPlan(parsedPlan);
        setPlayerDetails(data.playerDetails || []);
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('获取教案详情失败:', error);
    } finally {
      setLoading(false);
    }
  }

  // 复制教案
  async function handleCopyPlan() {
    if (!plan) return;

    try {
      setCopying(true);
      const response = await fetchWithAuth('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${plan.title} (副本)`,
          date: new Date().toISOString(),
          duration: plan.duration,
          group: plan.group,
          location: plan.location,
          weather: plan.weather,
          theme: plan.theme,
          focusSkills: plan.focusSkills ? JSON.parse(plan.focusSkills) : [],
          intensity: plan.intensity || 'medium',
          sections: plan.sections || [],
          notes: plan.notes,
          generatedBy: plan.generatedBy,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert('教案复制成功！');
        router.push(`/plans/${result.id}`);
      } else {
        alert('复制失败: ' + result.error);
      }
    } catch (error) {
      console.error('复制教案失败:', error);
      alert('复制失败');
    } finally {
      setCopying(false);
    }
  }

  // 切换收藏
  async function toggleFavorite() {
    if (!plan) return;
    try {
      const response = await fetchWithAuth(`/api/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !plan.isFavorite }),
      });
      const result = await response.json();
      if (result.success) {
        setPlan({ ...plan, isFavorite: !plan.isFavorite });
      }
    } catch (error) {
      console.error('切换收藏失败:', error);
    }
  }

  // 切换模板
  async function toggleTemplate() {
    if (!plan) return;
    try {
      const response = await fetchWithAuth(`/api/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTemplate: !plan.isTemplate }),
      });
      const result = await response.json();
      if (result.success) {
        setPlan({ ...plan, isTemplate: !plan.isTemplate });
      }
    } catch (error) {
      console.error('切换模板失败:', error);
    }
  }

  // 保存为案例
  async function handleSaveAsCase() {
    if (!plan) return;

    try {
      // 把教案的 sections 展开成案例
      const casesToCreate: Array<{
        title: string;
        category: string;
        ageGroup: string;
        content: string;
        method?: string;
        keyPoints?: string;
        coachGuide?: string;
        duration: number;
        equipment: string[];
        techType?: string;
        tags: string[];
      }> = [];

      (plan.sections || []).forEach((section: Section) => {
        (section.activities || []).forEach((activity) => {
          const keyPointsStr = activity.keyPoints?.join('；') || '';
          casesToCreate.push({
            title: activity.name,
            category: section.category || 'technical',
            ageGroup: plan.group || 'U10',
            content: activity.description,
            method:
              activity.sets || activity.repetitions
                ? `组数: ${activity.sets || '-'} 次/时间: ${activity.repetitions || '-'}`
                : undefined,
            keyPoints: keyPointsStr || undefined,
            coachGuide: activity.coachGuide || undefined,
            duration: activity.duration || 10,
            equipment: activity.equipment || [],
            techType: plan.theme || undefined,
            tags: [plan.theme || '', section.category].filter(Boolean),
          });
        });
      });

      if (casesToCreate.length === 0) {
        alert('教案没有可保存的训练活动');
        return;
      }

      const response = await fetchWithAuth('/api/cases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cases: casesToCreate }),
      });

      const result = await response.json();
      if (result.success) {
        alert(`成功保存 ${result.imported} 个训练活动到案例库！`);
      } else {
        alert('保存失败: ' + result.error);
      }
    } catch (error) {
      console.error('保存为案例失败:', error);
      alert('保存失败');
    }
  }

  // 出勤状态图标和样式
  const getAttendanceInfo = (attendance: string) => {
    switch (attendance) {
      case 'present':
        return {
          icon: UserCheck,
          label: '已签到',
          color: 'text-green-600',
          bg: 'bg-green-50 border-green-200',
        };
      case 'absent':
        return {
          icon: UserX,
          label: '缺勤',
          color: 'text-red-600',
          bg: 'bg-red-50 border-red-200',
        };
      case 'late':
        return {
          icon: AlertCircle,
          label: '迟到',
          color: 'text-amber-600',
          bg: 'bg-amber-50 border-amber-200',
        };
      default:
        return {
          icon: UserCheck,
          label: '已签到',
          color: 'text-green-600',
          bg: 'bg-green-50 border-green-200',
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">教案不存在</h2>
          <Link href="/plans" className="text-orange-600 hover:text-orange-700">
            返回教案库
          </Link>
        </div>
      </div>
    );
  }

  // 统计
  const totalTime = plan.duration;
  const activityCount = plan.sections?.length || 0;
  const totalPlayers = playerDetails.length;
  const presentCount = records.filter((r) => r.attendance === 'present').length;
  const lateCount = records.filter((r) => r.attendance === 'late').length;
  const absentCount = records.filter((r) => r.attendance === 'absent').length;

  // 获取环节颜色
  const getSectionColor = (category: string) => {
    switch (category) {
      case 'warmup':
        return 'bg-blue-100 text-blue-700';
      case 'ball_familiarity':
        return 'bg-amber-100 text-amber-700';
      case 'technical':
        return 'bg-orange-100 text-orange-700';
      case 'physical':
        return 'bg-red-100 text-red-700';
      case 'tactical':
        return 'bg-purple-100 text-purple-700';
      case 'game':
        return 'bg-green-100 text-green-700';
      case 'cooldown':
        return 'bg-gray-100 text-gray-700';
      case 'etiquette':
        return 'bg-pink-100 text-pink-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getSectionLabel = (category: string) => {
    const labels: Record<string, string> = {
      warmup: '热身',
      ball_familiarity: '球性',
      technical: '技术',
      physical: '体能',
      tactical: '战术',
      game: '对抗',
      cooldown: '放松',
      etiquette: '礼仪',
    };
    return labels[category] || category;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/plans" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900">{plan.title}</h1>
                  {plan.generatedBy === 'ai' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                      <Sparkles className="w-3 h-3" />
                      AI生成
                    </span>
                  )}
                  {totalPlayers > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                      <Users className="w-3 h-3" />
                      {totalPlayers}人
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                  <span>{plan.date}</span>
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                    {plan.group}
                  </span>
                  {plan.theme && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {plan.theme}
                    </span>
                  )}
                  {plan.skillLevel && (
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full text-white ${
                        plan.skillLevel === 'advanced'
                          ? 'bg-indigo-500'
                          : plan.skillLevel === 'intermediate'
                            ? 'bg-blue-500'
                            : 'bg-cyan-500'
                      }`}
                    >
                      {plan.skillLevel === 'advanced'
                        ? '精英'
                        : plan.skillLevel === 'intermediate'
                          ? '进阶'
                          : '基础'}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full text-white ${
                      plan.intensity === 'high'
                        ? 'bg-red-600'
                        : plan.intensity === 'medium'
                          ? 'bg-yellow-600'
                          : 'bg-green-600'
                    }`}
                  >
                    {plan.intensity === 'high'
                      ? '高强度'
                      : plan.intensity === 'medium'
                        ? '中强度'
                        : '低强度'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* 次要操作：图标按钮 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleFavorite}
                  className={`p-2 rounded-lg transition-colors ${
                    plan.isFavorite
                      ? 'text-yellow-500 hover:bg-yellow-50'
                      : 'text-gray-400 hover:bg-gray-100 hover:text-yellow-500'
                  }`}
                  title={plan.isFavorite ? '取消收藏' : '收藏'}
                >
                  <Star className={`w-5 h-5 ${plan.isFavorite ? 'fill-yellow-400' : ''}`} />
                </button>
                <button
                  onClick={toggleTemplate}
                  className={`p-2 rounded-lg transition-colors ${
                    plan.isTemplate
                      ? 'text-purple-500 hover:bg-purple-50'
                      : 'text-gray-400 hover:bg-gray-100 hover:text-purple-500'
                  }`}
                  title={plan.isTemplate ? '取消模板' : '存为模板'}
                >
                  <LayoutTemplate className="w-5 h-5" />
                </button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <button
                  onClick={handleCopyPlan}
                  disabled={copying}
                  className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg disabled:opacity-50"
                  title="复制"
                >
                  {copying ? (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
                <Link
                  href={`/plans/${plan.id}/edit`}
                  className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg"
                  title="编辑"
                >
                  <Edit className="w-5 h-5" />
                </Link>
                <button
                  className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg"
                  title="导出"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
              {/* 主要操作：文字按钮 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveAsCase}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  title="将教案中的训练活动保存到案例库"
                >
                  <Save className="w-4 h-4" />
                  <span>保存为案例</span>
                </button>
                <Link
                  href={`/training?planId=${plan.id}`}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>开始训练</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 教案概览 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <div className="text-sm text-gray-500">训练时长</div>
                <div className="font-semibold text-gray-900">{plan.duration}分钟</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-sm text-gray-500">训练场地</div>
                <div className="font-semibold text-gray-900">{plan.location}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-sm text-gray-500">
                  {totalPlayers > 0 ? '参训人数' : '适合人数'}
                </div>
                <div className="font-semibold text-gray-900">
                  {totalPlayers > 0 ? `${totalPlayers}人` : '8-12人'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-purple-500" />
              <div>
                <div className="text-sm text-gray-500">训练内容</div>
                <div className="font-semibold text-gray-900">{activityCount}项</div>
              </div>
            </div>
          </div>

          {/* 训练目标 */}
          {plan.objective && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">训练目标</h3>
              <p className="text-gray-600">{plan.objective}</p>
            </div>
          )}
        </div>

        {/* 参训学员 */}
        {totalPlayers > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">参训学员</h2>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {presentCount > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <UserCheck className="w-4 h-4" />
                    {presentCount}到
                  </span>
                )}
                {lateCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    {lateCount}迟
                  </span>
                )}
                {absentCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <UserX className="w-4 h-4" />
                    {absentCount}缺
                  </span>
                )}
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {playerDetails.map((player, idx) => {
                // 查找对应的训练记录
                const record = records.find((r) => r.playerId === player.id);
                const attendanceInfo = record ? getAttendanceInfo(record.attendance) : null;
                const AttendanceIcon = attendanceInfo?.icon || UserCheck;

                return (
                  <div
                    key={player.id}
                    className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{player.name}</div>
                        <div className="text-xs text-gray-400">{player.group}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {attendanceInfo && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${attendanceInfo.bg} ${attendanceInfo.color}`}
                        >
                          <AttendanceIcon className="w-3 h-3" />
                          {attendanceInfo.label}
                        </span>
                      )}
                      {record?.feedback && (
                        <span
                          className="text-xs text-gray-400 max-w-[120px] truncate"
                          title={record.feedback}
                        >
                          {record.feedback}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 训练内容 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">训练内容</h2>
          {plan.sections?.map((section, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getSectionColor(section.category)}`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{section.name}</h3>
                    <span className="text-sm text-gray-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {section.duration}分钟
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${getSectionColor(section.category)}`}
                      >
                        {getSectionLabel(section.category)}
                      </span>
                    </span>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-gray-300" />
                </button>
              </div>

              {/* 第一节显示训练递进说明 */}
              {index === 0 && plan.trainingProgression && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-medium text-blue-800 mb-2">📈 训练递进关联说明</div>
                  <div className="text-xs text-blue-700 whitespace-pre-line leading-relaxed">
                    {plan.trainingProgression}
                  </div>
                </div>
              )}

              <div className="ml-11 space-y-3">
                {section.activities?.map((activity, aIdx: number) => (
                  <div key={aIdx} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{activity.name}</span>
                      <span className="text-sm text-gray-500">{activity.duration}分钟</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{activity.description}</p>

                    {/* 关联提示 - 在热身为后面的训练做准备时显示 */}
                    {activity.relatedTo && (
                      <div className="mt-1 mb-2">
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          💡 {activity.relatedTo}
                        </span>
                      </div>
                    )}

                    {activity.keyPoints && activity.keyPoints.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {activity.keyPoints.map((point: string, pIdx: number) => (
                          <span
                            key={pIdx}
                            className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded"
                          >
                            {point}
                          </span>
                        ))}
                      </div>
                    )}

                    {activity.equipment && activity.equipment.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        器材：{activity.equipment.join('、')}
                      </div>
                    )}

                    {/* SVG战术图解 - 移动端可滚动 */}
                    {activity.drillDiagram && (
                      <div className="mt-3 bg-white rounded-lg border border-gray-200 p-3">
                        <div className="text-xs font-medium text-gray-600 mb-2">动作路线示意图</div>
                        <div className="overflow-x-auto -mx-2 px-2 sm:overflow-x-visible sm:mx-0 sm:px-0">
                          <div
                            className="inline-block min-w-full sm:min-w-0"
                            dangerouslySetInnerHTML={{ __html: activity.drillDiagram }}
                          />
                        </div>
                      </div>
                    )}

                    {/* 组数、次数、递进式 */}
                    {(activity.sets || activity.repetitions || activity.progression) && (
                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
                        {activity.sets && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">组数：</span>
                            <span className="text-gray-600">{activity.sets}</span>
                          </div>
                        )}
                        {activity.repetitions && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">次数/时间：</span>
                            <span className="text-gray-600">{activity.repetitions}</span>
                          </div>
                        )}
                        {activity.progression && (
                          <div className="mt-1">
                            <div className="font-medium text-gray-700 mb-1">递进式设计：</div>
                            <div className="text-gray-600 whitespace-pre-line">
                              {activity.progression}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {section.points && section.points.length > 0 && (
                <div className="ml-11 mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700">
                    重点：{section.points.join(' · ')}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 注意事项 */}
        {plan.notes && (
          <div className="mt-6 bg-yellow-50 rounded-xl p-5 border border-yellow-200">
            <h3 className="font-semibold text-gray-900 mb-2">注意事项</h3>
            <p className="text-sm text-gray-700">{plan.notes}</p>
          </div>
        )}
      </main>
    </div>
  );
}
