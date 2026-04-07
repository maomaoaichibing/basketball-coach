'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/auth';
import {
  ArrowLeft,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  Edit2,
  Trash2,
  X,
  Check,
} from 'lucide-react';

// 类型定义
type Schedule = {
  id: string;
  title: string;
  group: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  duration: number;
  location: string;
  coachName?: string;
  maxPlayers: number;
  currentCount: number;
  status: string;
  team?: { id: string; name: string };
};

const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const groups = ['all', 'U6', 'U8', 'U10', 'U12', 'U14'];

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const [form, setForm] = useState({
    title: '',
    group: 'U10',
    dayOfWeek: 6,
    startTime: '09:00',
    endTime: '10:30',
    duration: 90,
    location: '',
    coachName: '',
    maxPlayers: 20,
  });

  useEffect(() => {
    fetchSchedules();
  }, [selectedGroup]);

  async function fetchSchedules() {
    try {
      const params = new URLSearchParams();
      if (selectedGroup !== 'all') params.set('group', selectedGroup);
      const res = await fetchWithAuth(`/api/schedules?${params}`);
      const data = await res.json();
      if (data.success) setSchedules(data.schedules);
    } catch (error) {
      console.error('获取排课失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      const url = editingSchedule ? `/api/schedules/${editingSchedule.id}` : '/api/schedules';
      const method = editingSchedule ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        fetchSchedules();
        setShowModal(false);
        resetForm();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('保存失败');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要删除这个课程安排吗？')) return;
    try {
      const res = await fetchWithAuth(`/api/schedules/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchSchedules();
      else alert(data.error);
    } catch (error) {
      alert('删除失败');
    }
  }

  function resetForm() {
    setForm({
      title: '',
      group: 'U10',
      dayOfWeek: 6,
      startTime: '09:00',
      endTime: '10:30',
      duration: 90,
      location: '',
      coachName: '',
      maxPlayers: 20,
    });
    setEditingSchedule(null);
  }

  function editSchedule(schedule: Schedule) {
    setEditingSchedule(schedule);
    setForm({
      title: schedule.title,
      group: schedule.group,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      duration: schedule.duration,
      location: schedule.location,
      coachName: schedule.coachName || '',
      maxPlayers: schedule.maxPlayers,
    });
    setShowModal(true);
  }

  const groupedByDay = Array.from({ length: 7 }, (_, i) =>
    schedules.filter((s) => s.dayOfWeek === i)
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">课程安排</h1>
                <p className="text-sm text-gray-500">管理每周训练时间</p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              <Plus className="w-4 h-4" /> 添加课程
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${selectedGroup === g ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              {g === 'all' ? '全部' : g}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {groupedByDay.map((daySchedules, dayIndex) => (
            <div
              key={dayIndex}
              className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[400px]"
            >
              <div className="p-4 border-b border-gray-100 text-center">
                <div
                  className={`text-lg font-bold ${dayIndex === 0 || dayIndex === 6 ? 'text-orange-600' : 'text-gray-900'}`}
                >
                  {dayNames[dayIndex]}
                </div>
                <div className="text-sm text-gray-500">{daySchedules.length} 节课</div>
              </div>
              <div className="p-2 space-y-2">
                {daySchedules.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">无课程安排</div>
                ) : (
                  daySchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="p-3 bg-orange-50 rounded-lg border border-orange-100 hover:shadow-md transition-shadow"
                    >
                      <div className="text-sm font-medium text-gray-900 mb-1">{schedule.title}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Clock className="w-3 h-3" />
                        {schedule.startTime}-{schedule.endTime}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        {schedule.location}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="px-2 py-0.5 bg-orange-200 text-orange-700 text-xs rounded-full">
                          {schedule.group}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              editSchedule(schedule);
                            }}
                            className="p-1 hover:bg-orange-200 rounded"
                          >
                            <Edit2 className="w-3 h-3 text-gray-500" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(schedule.id);
                            }}
                            className="p-1 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-3 h-3 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingSchedule ? '编辑课程' : '添加课程'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">课程名称</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="如：U10 周六训练课"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">年龄段</label>
                  <select
                    value={form.group}
                    onChange={(e) => setForm((prev) => ({ ...prev, group: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">星期</label>
                  <select
                    value={form.dayOfWeek}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        dayOfWeek: parseInt(e.target.value),
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    {dayNames.map((name, i) => (
                      <option key={i} value={i}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        startTime: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">训练地点</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="如：篮球场1号馆"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">教练姓名</label>
                <input
                  type="text"
                  value={form.coachName}
                  onChange={(e) => setForm((prev) => ({ ...prev, coachName: e.target.value }))}
                  placeholder="如：张教练"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">最大人数</label>
                <input
                  type="number"
                  value={form.maxPlayers}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      maxPlayers: parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
