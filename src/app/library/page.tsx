'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/auth';
import {
  ArrowLeft,
  Plus,
  Search,
  Clock,
  Star,
  Upload,
  Trash2,
  Edit,
  X,
  ChevronDown,
  Database,
  Sparkles,
  Tag,
  Users,
  Target,
  BookOpen,
} from 'lucide-react';

type TrainingCase = {
  id: string;
  title: string;
  category: string;
  subCategory?: string;
  ageGroup: string;
  skillLevel: string;
  content: string;
  method?: string;
  keyPoints?: string;
  coachGuide?: string;
  duration: number;
  difficulty: number;
  equipment: string;
  minPlayers: number;
  maxPlayers: number;
  techType?: string;
  tags: string;
  source: string;
  usageCount: number;
  isFavorite: boolean;
  createdAt: string;
};

const CATEGORIES: Record<string, string> = {
  warmup: '热身',
  technical: '技术训练',
  tactical: '战术训练',
  game: '对抗比赛',
  cooldown: '放松',
  physical: '体能训练',
  etiquette: '礼仪',
  other: '其他',
};

const TECH_TYPES = ['运球', '传球', '投篮', '防守', '体能', '战术', '礼仪', '综合'];

export default function LibraryPage() {
  const [cases, setCases] = useState<TrainingCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState('all');
  const [techTypeFilter, setTechTypeFilter] = useState('all');
  const [total, setTotal] = useState(0);

  // 模态框
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingCase, setEditingCase] = useState<TrainingCase | null>(null);
  const [importing, setImporting] = useState(false);

  // 表单
  const [form, setForm] = useState({
    title: '',
    category: 'technical',
    subCategory: '',
    ageGroup: 'U10',
    skillLevel: 'intermediate',
    content: '',
    method: '',
    keyPoints: '',
    coachGuide: '',
    duration: 10,
    difficulty: 1,
    equipment: '',
    minPlayers: 1,
    maxPlayers: 20,
    techType: '',
    tags: '',
  });

  const groups = ['all', 'U6', 'U8', 'U10', 'U12', 'U14'];

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '100' });
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (ageGroupFilter !== 'all') params.set('ageGroup', ageGroupFilter);
      if (techTypeFilter !== 'all') params.set('techType', techTypeFilter);
      if (search) params.set('search', search);

      const response = await fetchWithAuth(`/api/cases?${params}`);
      const data = await response.json();

      if (data.success) {
        setCases(data.cases);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('获取案例列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, ageGroupFilter, techTypeFilter, search]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // 重置表单
  function resetForm() {
    setForm({
      title: '',
      category: 'technical',
      subCategory: '',
      ageGroup: 'U10',
      skillLevel: 'intermediate',
      content: '',
      method: '',
      keyPoints: '',
      coachGuide: '',
      duration: 10,
      difficulty: 1,
      equipment: '',
      minPlayers: 1,
      maxPlayers: 20,
      techType: '',
      tags: '',
    });
    setEditingCase(null);
  }

  // 打开编辑
  function openEdit(c: TrainingCase) {
    setEditingCase(c);
    setForm({
      title: c.title,
      category: c.category,
      subCategory: c.subCategory || '',
      ageGroup: c.ageGroup,
      skillLevel: c.skillLevel,
      content: c.content,
      method: c.method || '',
      keyPoints: c.keyPoints || '',
      coachGuide: c.coachGuide || '',
      duration: c.duration,
      difficulty: c.difficulty,
      equipment: Array.isArray(JSON.parse(c.equipment || '[]'))
        ? JSON.parse(c.equipment).join(', ')
        : c.equipment,
      minPlayers: c.minPlayers,
      maxPlayers: c.maxPlayers,
      techType: c.techType || '',
      tags: Array.isArray(JSON.parse(c.tags || '[]')) ? JSON.parse(c.tags).join(', ') : c.tags,
    });
    setShowForm(true);
  }

  // 提交表单（新增/编辑）
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        equipment: form.equipment
          ? form.equipment
              .split(/[,，]/)
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        tags: form.tags
          ? form.tags
              .split(/[,，]/)
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      };

      if (editingCase) {
        const response = await fetchWithAuth(`/api/cases/${editingCase.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (result.success) {
          setShowForm(false);
          resetForm();
          fetchCases();
        } else {
          alert('更新失败: ' + result.error);
        }
      } else {
        const response = await fetchWithAuth('/api/cases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (result.success) {
          setShowForm(false);
          resetForm();
          fetchCases();
        } else {
          alert('创建失败: ' + result.error);
        }
      }
    } catch (error) {
      console.error('提交失败:', error);
      alert('操作失败');
    }
  }

  // 删除案例
  async function handleDelete(id: string) {
    if (!confirm('确定要删除这个案例吗？')) return;

    try {
      const response = await fetchWithAuth(`/api/cases/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        fetchCases();
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  }

  // 切换收藏
  async function toggleFavorite(c: TrainingCase) {
    try {
      const response = await fetchWithAuth(`/api/cases/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !c.isFavorite }),
      });
      const result = await response.json();
      if (result.success) {
        setCases((prev) =>
          prev.map((item) => (item.id === c.id ? { ...item, isFavorite: !c.isFavorite } : item))
        );
      }
    } catch (error) {
      console.error('切换收藏失败:', error);
    }
  }

  // 从RAG数据导入
  async function handleRagImport() {
    if (!confirm('将从内置训练数据库导入案例，继续吗？')) return;

    try {
      setImporting(true);
      const response = await fetchWithAuth('/api/cases/import', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100 }),
      });
      const result = await response.json();
      if (result.success) {
        alert(`成功导入 ${result.imported} 条案例！`);
        fetchCases();
        setShowImport(false);
      } else {
        alert('导入失败: ' + result.error);
      }
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败');
    } finally {
      setImporting(false);
    }
  }

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
              <div>
                <h1 className="text-xl font-bold text-gray-900">案例库</h1>
                <p className="text-sm text-gray-500">{total} 条训练案例</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  resetForm();
                  setShowImport(true);
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg"
              >
                <Database className="w-4 h-4" />
                导入数据
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
              >
                <Plus className="w-4 h-4" />
                新增案例
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 搜索和筛选 */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索案例标题、内容、技术类型..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">全部分类</option>
            {Object.entries(CATEGORIES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={ageGroupFilter}
            onChange={(e) => setAgeGroupFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            {groups.map((g) => (
              <option key={g} value={g}>
                {g === 'all' ? '全部年龄' : g}
              </option>
            ))}
          </select>

          <select
            value={techTypeFilter}
            onChange={(e) => setTechTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">全部技术</option>
            {TECH_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* 案例列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">暂无案例</h2>
            <p className="text-gray-500 mb-4">
              {total === 0 ? '点击「导入数据」从内置库导入，或手动创建案例' : '没有匹配的筛选条件'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  resetForm();
                  setShowImport(true);
                }}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg"
              >
                <Database className="w-4 h-4 inline mr-2" />
                导入数据
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                新增案例
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {cases.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-bold text-gray-900">{c.title}</h3>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                        {CATEGORIES[c.category] || c.category}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {c.ageGroup}
                      </span>
                      {c.techType && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          {c.techType}
                        </span>
                      )}
                      {c.isFavorite && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
                    </div>

                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{c.content}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {c.duration}分钟
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        难度 {c.difficulty}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {c.minPlayers}-{c.maxPlayers}人
                      </span>
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
                        {c.source === 'import' ? '导入' : c.source === 'ai' ? 'AI生成' : '手动'}
                      </span>
                    </div>

                    {/* 标签 */}
                    {(() => {
                      try {
                        const tags = JSON.parse(c.tags || '[]');
                        if (tags.length > 0) {
                          return (
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              {tags.slice(0, 5).map((tag: string, i: number) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-gray-50 text-gray-500 text-xs rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          );
                        }
                      } catch {
                        /* ignore */
                      }
                      return null;
                    })()}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    <button
                      onClick={() => toggleFavorite(c)}
                      className="p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                      title={c.isFavorite ? '取消收藏' : '收藏'}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          c.isFavorite
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 hover:text-yellow-400'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => openEdit(c)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-2 hover:bg-red-50 rounded-lg"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 新增/编辑模态框 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 mb-10">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">{editingCase ? '编辑案例' : '新增案例'}</h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="案例标题"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分类 *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {Object.entries(CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">年龄组</label>
                  <select
                    value={form.ageGroup}
                    onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {groups
                      .filter((g) => g !== 'all')
                      .map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">技术类型</label>
                  <select
                    value={form.techType}
                    onChange={(e) => setForm({ ...form, techType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">不限</option>
                    {TECH_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">水平</label>
                  <select
                    value={form.skillLevel}
                    onChange={(e) => setForm({ ...form, skillLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="beginner">基础</option>
                    <option value="intermediate">进阶</option>
                    <option value="advanced">精英</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">时长(分钟)</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">难度(1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={form.difficulty}
                    onChange={(e) =>
                      setForm({ ...form, difficulty: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">人数范围</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={form.minPlayers}
                      onChange={(e) =>
                        setForm({ ...form, minPlayers: parseInt(e.target.value) || 1 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="number"
                      min={1}
                      value={form.maxPlayers}
                      onChange={(e) =>
                        setForm({ ...form, maxPlayers: parseInt(e.target.value) || 20 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* 训练内容 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">训练内容 *</label>
                <textarea
                  required
                  rows={3}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="描述训练活动的具体内容"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">训练方法</label>
                <textarea
                  rows={2}
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="组织方式和教学方法"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">要点目的</label>
                <textarea
                  rows={2}
                  value={form.keyPoints}
                  onChange={(e) => setForm({ ...form, keyPoints: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="关键要点和训练目的"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">教练引导语</label>
                <textarea
                  rows={2}
                  value={form.coachGuide}
                  onChange={(e) => setForm({ ...form, coachGuide: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="给教练的提示和引导语"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  器材（逗号分隔）
                </label>
                <input
                  type="text"
                  value={form.equipment}
                  onChange={(e) => setForm({ ...form, equipment: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="如：篮球, 标志物, 雪糕筒"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标签（逗号分隔）
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="如：团队配合, 快攻, 突破"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
                >
                  {editingCase ? '保存修改' : '创建案例'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 导入模态框 */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">导入案例</h2>
              <button
                onClick={() => setShowImport(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleRagImport}
                disabled={importing}
                className="w-full p-4 border-2 border-dashed border-orange-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Database className="w-5 h-5 text-orange-500" />
                  <span className="font-medium text-gray-900">从内置数据库导入</span>
                </div>
                <p className="text-sm text-gray-500">
                  从系统内置的训练教案库（RAG数据）导入案例到案例库
                </p>
              </button>

              <div className="text-center text-sm text-gray-400">
                支持导入已验证的训练案例，后续可手动编辑和管理
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
