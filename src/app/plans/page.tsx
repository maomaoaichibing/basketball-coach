'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/auth';
import {
  ArrowLeft,
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  Target,
  MoreVertical,
  Copy,
  Edit,
  Trash2,
  Download,
  Sparkles,
  Users,
} from 'lucide-react';

// 教案类型
type TrainingPlan = {
  id: string;
  title: string;
  date: string;
  duration: number;
  group: string;
  location: string;
  weather?: string;
  theme?: string;
  focusSkills?: string;
  intensity?: string;
  skillLevel?: string;
  status?: string;
  generatedBy?: string;
  createdAt?: string;
  sections?: string;
  playerIds?: string;
};

export default function PlansPage() {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [themeFilter, setThemeFilter] = useState('all');
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const router = useRouter();

  const groups = ['all', 'U6', 'U8', 'U10', 'U12', 'U14'];
  const themes = [
    'all',
    '运球基础',
    '传球技术',
    '投篮训练',
    '防守入门',
    '进攻战术',
    '体能训练',
    '综合训练',
    '对抗比赛',
  ];

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/api/plans?limit=50');
      const data = await response.json();

      if (data.success) {
        // 解析 focusSkills
        const parsedPlans = data.plans.map((plan: TrainingPlan) => ({
          ...plan,
          focusSkills: plan.focusSkills ? JSON.parse(plan.focusSkills as string) : [],
        }));
        setPlans(parsedPlans);
      }
    } catch (error) {
      console.error('获取教案列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // 复制教案
  async function handleCopyPlan(plan: TrainingPlan, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    try {
      setCopyingId(plan.id);
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
          skillLevel: plan.skillLevel || 'intermediate',
          sections: plan.sections ? JSON.parse(plan.sections) : [],
          notes: '',
          generatedBy: plan.generatedBy,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert('教案复制成功！');
        fetchPlans();
        // 跳转到新教案详情页
        router.push(`/plans/${result.id}`);
      } else {
        alert('复制失败: ' + result.error);
      }
    } catch (error) {
      console.error('复制教案失败:', error);
      alert('复制失败');
    } finally {
      setCopyingId(null);
    }
  }

  const filteredPlans = plans.filter(p => {
    if (groupFilter !== 'all' && p.group !== groupFilter) return false;
    if (themeFilter !== 'all' && p.theme !== themeFilter) return false;
    if (search && !p.title.includes(search)) return false;
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
              <h1 className="text-xl font-bold text-gray-900">教案库</h1>
              <span className="text-sm text-gray-500">{filteredPlans.length}份教案</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/api/export?type=plans&format=excel"
                download
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg"
              >
                <Download className="w-4 h-4" />
                导出
              </a>
              <Link
                href="/plan/new"
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
              >
                <Plus className="w-4 h-4" />
                新建教案
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 搜索和筛选 */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索教案..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <select
            value={groupFilter}
            onChange={e => setGroupFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            {groups.map(g => (
              <option key={g} value={g}>
                {g === 'all' ? '全部分组' : g}
              </option>
            ))}
          </select>

          <select
            value={themeFilter}
            onChange={e => setThemeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            {themes.map(t => (
              <option key={t} value={t}>
                {t === 'all' ? '全部主题' : t}
              </option>
            ))}
          </select>
        </div>

        {/* 教案列表 */}
        <div className="space-y-3">
          {filteredPlans.map(plan => (
            <Link
              key={plan.id}
              href={`/plans/${plan.id}`}
              className="block bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-gray-900">{plan.title}</h3>
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                      {plan.group}
                    </span>
                    {plan.theme && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {plan.theme}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 text-xs rounded-full text-white ${
                      plan.skillLevel === 'advanced'
                        ? 'bg-indigo-500'
                        : plan.skillLevel === 'intermediate'
                          ? 'bg-blue-500'
                          : 'bg-cyan-500'
                    }`}>
                      {plan.skillLevel === 'advanced'
                        ? '精英'
                        : plan.skillLevel === 'intermediate'
                          ? '进阶'
                          : '基础'}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full text-white ${
                      plan.intensity === 'high'
                        ? 'bg-red-600'
                        : plan.intensity === 'medium'
                          ? 'bg-yellow-600'
                          : 'bg-green-600'
                    }`}>
                      {plan.intensity === 'high'
                        ? '高强度'
                        : plan.intensity === 'medium'
                          ? '中强度'
                          : '低强度'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {plan.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {plan.duration}分钟
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {plan.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      {plan.sections ? JSON.parse(plan.sections).length : 0}项内容
                    </span>
                    {/* 参训人数 */}
                    {(() => {
                      try {
                        const ids = JSON.parse(plan.playerIds || '[]');
                        if (ids.length > 0) {
                          return (
                            <span className="flex items-center gap-1 text-green-600">
                              <Users className="w-4 h-4" />
                              {ids.length}人
                            </span>
                          );
                        }
                      } catch {
                        /* ignore */
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => handleCopyPlan(plan, e)}
                    disabled={copyingId === plan.id}
                    className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                    title="复制"
                  >
                    {copyingId === plan.id ? (
                      <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={e => e.preventDefault()}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="编辑"
                  >
                    <Edit className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={e => e.preventDefault()}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="导出"
                  >
                    <Download className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={e => e.preventDefault()}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="更多"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* 空状态 */}
        {filteredPlans.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">没有找到匹配的教案</p>
            <Link href="/plan/new" className="text-orange-600 hover:text-orange-700">
              创建第一份教案
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
