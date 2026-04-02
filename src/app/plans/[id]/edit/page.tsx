'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Clock,
  MapPin,
  Calendar,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
} from 'lucide-react';

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
  focusSkills?: string;
  intensity?: string;
  status?: string;
  sections?: string;
  notes?: string;
};

const categories = [
  { id: 'warmup', label: '热身', color: 'bg-yellow-100 text-yellow-700' },
  {
    id: 'ball_familiarity',
    label: '球性',
    color: 'bg-amber-100 text-amber-700',
  },
  { id: 'technical', label: '技术', color: 'bg-blue-100 text-blue-700' },
  { id: 'physical', label: '体能', color: 'bg-orange-100 text-orange-700' },
  { id: 'tactical', label: '战术', color: 'bg-purple-100 text-purple-700' },
  { id: 'game', label: '对抗', color: 'bg-red-100 text-red-700' },
  { id: 'cooldown', label: '放松', color: 'bg-green-100 text-green-700' },
];

export default function EditPlanPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [sections, setSections] = useState<Section[]>([]);

  // 表单状态
  const [form, setForm] = useState({
    title: '',
    date: '',
    duration: 90,
    location: '室内',
    weather: '',
    theme: '',
    intensity: 'medium',
    notes: '',
  });

  useEffect(() => {
    fetchPlan();
  }, [params.id]);

  async function fetchPlan() {
    try {
      const response = await fetch(`/api/plans/${params.id}`);
      const data = await response.json();

      if (data.success) {
        const p = data.plan;
        setPlan(p);
        setForm({
          title: p.title || '',
          date: p.date ? p.date.split('T')[0] : '',
          duration: p.duration || 90,
          location: p.location || '室内',
          weather: p.weather || '',
          theme: p.theme || '',
          intensity: p.intensity || 'medium',
          notes: p.notes || '',
        });
        setSections(p.sections ? JSON.parse(p.sections) : []);
      }
    } catch (error) {
      console.error('获取教案失败:', error);
      alert('获取教案失败');
    } finally {
      setLoading(false);
    }
  }

  // 添加环节
  function addSection() {
    setSections([
      ...sections,
      {
        category: 'warmup',
        name: '',
        duration: 10,
        activities: [],
      },
    ]);
  }

  // 删除环节
  function removeSection(index: number) {
    setSections(sections.filter((_, i) => i !== index));
  }

  // 更新环节
  function updateSection(index: number, field: string, value: any) {
    const newSections = [...sections];
    (newSections[index] as any)[field] = value;
    setSections(newSections);
  }

  // 添加活动
  function addActivity(sectionIndex: number) {
    const newSections = [...sections];
    newSections[sectionIndex].activities.push({
      name: '',
      duration: 5,
      description: '',
    });
    setSections(newSections);
  }

  // 删除活动
  function removeActivity(sectionIndex: number, activityIndex: number) {
    const newSections = [...sections];
    newSections[sectionIndex].activities.splice(activityIndex, 1);
    setSections(newSections);
  }

  // 更新活动
  function updateActivity(sectionIndex: number, activityIndex: number, field: string, value: any) {
    const newSections = [...sections];
    (newSections[sectionIndex].activities[activityIndex] as any)[field] = value;
    setSections(newSections);
  }

  // 保存
  async function handleSave() {
    if (!form.title) {
      alert('请输入教案标题');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/plans/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          date: form.date,
          duration: form.duration,
          location: form.location,
          weather: form.weather || null,
          theme: form.theme || null,
          intensity: form.intensity,
          notes: form.notes || null,
          sections: JSON.stringify(sections),
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('保存成功！');
        router.push(`/plans/${params.id}`);
      } else {
        alert('保存失败：' + data.error);
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/plans/${params.id}`} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">编辑教案</h1>
                <p className="text-sm text-gray-500">修改教案内容</p>
              </div>
            </div>
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
              保存修改
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* 基本信息 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">基本信息</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">教案标题</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="输入教案标题"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">训练日期</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">训练时长</label>
              <select
                value={form.duration}
                onChange={e => setForm({ ...form, duration: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value={60}>60分钟</option>
                <option value={90}>90分钟</option>
                <option value={120}>120分钟</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">训练场地</label>
              <select
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="室内">室内</option>
                <option value="室外">室外</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">天气</label>
              <select
                value={form.weather}
                onChange={e => setForm({ ...form, weather: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">不限定</option>
                <option value="晴天">晴天</option>
                <option value="阴天">阴天</option>
                <option value="雨天">雨天</option>
                <option value="雪天">雪天</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">训练主题</label>
              <select
                value={form.theme}
                onChange={e => setForm({ ...form, theme: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">选择主题</option>
                <option value="运球基础">运球基础</option>
                <option value="传球技术">传球技术</option>
                <option value="投篮训练">投篮训练</option>
                <option value="防守入门">防守入门</option>
                <option value="进攻战术">进攻战术</option>
                <option value="体能训练">体能训练</option>
                <option value="综合训练">综合训练</option>
                <option value="对抗比赛">对抗比赛</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="训练注意事项..."
              />
            </div>
          </div>
        </div>

        {/* 训练内容 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">训练内容</h2>
            <button
              onClick={addSection}
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
            >
              <Plus className="w-4 h-4" />
              添加环节
            </button>
          </div>

          {sections.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>暂无训练内容</p>
              <button onClick={addSection} className="mt-2 text-orange-500 hover:text-orange-600">
                添加第一个环节
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <GripVertical className="w-5 h-5 text-gray-300" />
                    <select
                      value={section.category}
                      onChange={e => updateSection(sectionIndex, 'category', e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={section.name}
                      onChange={e => updateSection(sectionIndex, 'name', e.target.value)}
                      placeholder="环节名称"
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg"
                    />
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={section.duration}
                        onChange={e =>
                          updateSection(sectionIndex, 'duration', parseInt(e.target.value) || 0)
                        }
                        className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-center"
                        min={1}
                      />
                      <span className="text-gray-500 text-sm">分钟</span>
                    </div>
                    <button
                      onClick={() => removeSection(sectionIndex)}
                      className="p-1.5 hover:bg-red-50 text-red-400 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 活动列表 */}
                  <div className="ml-8 space-y-2">
                    {section.activities.map((activity, activityIndex) => (
                      <div key={activityIndex} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                            活动 {activityIndex + 1}
                          </span>
                          <input
                            type="text"
                            value={activity.name}
                            onChange={e =>
                              updateActivity(sectionIndex, activityIndex, 'name', e.target.value)
                            }
                            placeholder="活动名称"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            value={activity.duration}
                            onChange={e =>
                              updateActivity(
                                sectionIndex,
                                activityIndex,
                                'duration',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                            min={1}
                          />
                          <span className="text-gray-500 text-xs">分钟</span>
                          <button
                            onClick={() => removeActivity(sectionIndex, activityIndex)}
                            className="p-1 hover:bg-red-50 text-red-400 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <textarea
                          value={activity.description}
                          onChange={e =>
                            updateActivity(
                              sectionIndex,
                              activityIndex,
                              'description',
                              e.target.value
                            )
                          }
                          placeholder="活动描述..."
                          rows={2}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => addActivity(sectionIndex)}
                      className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      添加活动
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
