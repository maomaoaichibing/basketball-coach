'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Package, Users, Clock, Edit2, Trash2, Check, X, AlertTriangle, Search, Filter } from 'lucide-react';
import { fetchWithAuth } from '@/lib/auth';

// 类型定义
type Player = {
  id: string;
  name: string;
  group: string;
};

type Course = {
  id: string;
  name: string;
  type: string;
  totalHours: number;
  price: number;
  validDays: number;
  groups: string[];
  description?: string;
  notes?: string;
  status: string;
};

type Enrollment = {
  id: string;
  playerId: string;
  player: Player;
  courseId: string;
  course: { id: string; name: string; type: string; totalHours: number };
  totalHours: number;
  usedHours: number;
  remainingHours: number;
  status: string;
  purchaseDate: string;
  expireDate?: string;
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'courses' | 'enrollments'>('courses');
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [searchEnroll, setSearchEnroll] = useState('');
  const [filterEnrollStatus, setFilterEnrollStatus] = useState<string>('all');

  // 表单状态
  const [courseForm, setCourseForm] = useState({
    name: '',
    type: 'package',
    totalHours: 48,
    price: 5000,
    validDays: 180,
    groups: [] as string[],
    description: '',
  });

  const [enrollForm, setEnrollForm] = useState({
    playerId: '',
    courseId: '',
    totalHours: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [coursesRes, enrollmentsRes, playersRes] = await Promise.all([
        fetchWithAuth('/api/courses'),
        fetchWithAuth('/api/enrollments'),
        fetchWithAuth('/api/players'),
      ]);
      const coursesData = await coursesRes.json();
      const enrollmentsData = await enrollmentsRes.json();
      const playersData = await playersRes.json();

      if (coursesData.success) setCourses(coursesData.courses);
      if (enrollmentsData.success) setEnrollments(enrollmentsData.enrollments);
      if (playersData.success) setPlayers(playersData.players);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCourse() {
    try {
      const url = editingCourse ? `/api/courses/${editingCourse.id}` : '/api/courses';
      const method = editingCourse ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseForm),
      });

      const data = await res.json();
      if (data.success) {
        fetchData();
        setShowCourseModal(false);
        resetCourseForm();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('保存失败');
    }
  }

  async function handleDeleteCourse(id: string) {
    if (!confirm('确定要删除这个课程包吗？')) return;
    try {
      const res = await fetchWithAuth(`/api/courses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('删除失败');
    }
  }

  async function handleEnroll() {
    if (!enrollForm.playerId || !enrollForm.courseId) {
      alert('请选择学员和课程包');
      return;
    }
    try {
      const course = courses.find((c) => c.id === enrollForm.courseId);
      const res = await fetchWithAuth('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: enrollForm.playerId,
          courseId: enrollForm.courseId,
          totalHours: enrollForm.totalHours || course?.totalHours,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        setShowEnrollModal(false);
        resetEnrollForm();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('创建失败');
    }
  }

  function resetCourseForm() {
    setCourseForm({
      name: '',
      type: 'package',
      totalHours: 48,
      price: 5000,
      validDays: 180,
      groups: [],
      description: '',
    });
    setEditingCourse(null);
  }

  function resetEnrollForm() {
    setEnrollForm({ playerId: '', courseId: '', totalHours: 0 });
  }

  function editCourse(course: Course) {
    setEditingCourse(course);
    setCourseForm({
      name: course.name,
      type: course.type,
      totalHours: course.totalHours,
      price: course.price,
      validDays: course.validDays,
      groups: course.groups,
      description: course.description || '',
    });
    setShowCourseModal(true);
  }

  function toggleGroup(group: string) {
    setCourseForm((prev) => ({
      ...prev,
      groups: prev.groups.includes(group)
        ? prev.groups.filter((g) => g !== group)
        : [...prev.groups, group],
    }));
  }

  const courseTypeMap: Record<string, string> = {
    package: '课时包',
    monthly: '月卡',
    season: '赛季卡',
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    active: { label: '使用中', color: 'bg-green-100 text-green-700' },
    completed: { label: '已用完', color: 'bg-gray-100 text-gray-700' },
    expired: { label: '已过期', color: 'bg-red-100 text-red-700' },
    cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-500' },
  };

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
              <h1 className="text-xl font-bold text-gray-900">课时管理</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCourseModal(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-orange-600"
              >
                <Plus className="w-4 h-4" />
                新建课程包
              </button>
              <button
                onClick={() => setShowEnrollModal(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-green-600"
              >
                <Plus className="w-4 h-4" />
                购买课程
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 标签页 */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'courses'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            课程包 ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('enrollments')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'enrollments'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            学员课时 ({enrollments.length})
          </button>
        </div>

        {/* 课程包列表 */}
        {activeTab === 'courses' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Package className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{course.name}</h3>
                      <span className="text-xs text-gray-500">
                        {courseTypeMap[course.type] || course.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => editCourse(course)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">总课时</span>
                    <span className="font-medium text-gray-900">{course.totalHours} 课时</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">价格</span>
                    <span className="font-medium text-orange-600">¥{course.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">有效期</span>
                    <span className="text-gray-700">{course.validDays} 天</span>
                  </div>
                  {course.groups.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">适用</span>
                      <div className="flex gap-1">
                        {course.groups.map((g) => (
                          <span
                            key={g}
                            className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {courses.length === 0 && (
              <div className="col-span-full bg-white rounded-xl p-12 text-center border border-gray-100">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无课程包</h3>
                <p className="text-gray-500 mb-4">点击上方按钮创建第一个课程包</p>
              </div>
            )}
          </div>
        )}

        {/* 学员课时列表 */}
        {activeTab === 'enrollments' && (
          <>
            {/* 课时预警卡片 */}
            {(() => {
              const lowHours = enrollments.filter(
                (e) => e.status === 'active' && e.remainingHours > 0 && e.remainingHours <= 5,
              );
              const expiringSoon = enrollments.filter((e) => {
                if (!e.expireDate || e.status !== 'active') return false;
                const daysLeft = Math.ceil(
                  (new Date(e.expireDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                );
                return daysLeft <= 14 && daysLeft > 0;
              });
              if (lowHours.length === 0 && expiringSoon.length === 0) return null;
              return (
                <div className="mb-4 space-y-2">
                  {lowHours.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-700">
                          课时不足预警 ({lowHours.length}人)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {lowHours.map((e) => (
                          <span
                            key={e.id}
                            className="px-2.5 py-1 bg-white border border-red-200 rounded-lg text-xs text-red-700"
                          >
                            {e.player?.name} - 剩余 {e.remainingHours} 课时
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {expiringSoon.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium text-yellow-700">
                          即将到期提醒 ({expiringSoon.length}人)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {expiringSoon.map((e) => {
                          const daysLeft = Math.ceil(
                            (new Date(e.expireDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                          );
                          return (
                            <span
                              key={e.id}
                              className="px-2.5 py-1 bg-white border border-yellow-200 rounded-lg text-xs text-yellow-700"
                            >
                              {e.player?.name} - 剩余 {daysLeft} 天到期
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 搜索和筛选 */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索学员、课程..."
                  value={searchEnroll}
                  onChange={(e) => setSearchEnroll(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                />
              </div>
              <select
                value={filterEnrollStatus}
                onChange={(e) => setFilterEnrollStatus(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">全部状态</option>
                <option value="active">使用中</option>
                <option value="completed">已用完</option>
                <option value="expired">已过期</option>
                <option value="cancelled">已取消</option>
                <option value="low-hours">课时不足</option>
              </select>
            </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left p-4 font-medium text-gray-600">学员</th>
                  <th className="text-left p-4 font-medium text-gray-600">课程</th>
                  <th className="text-left p-4 font-medium text-gray-600">总课时</th>
                  <th className="text-left p-4 font-medium text-gray-600">已用</th>
                  <th className="text-left p-4 font-medium text-gray-600">剩余</th>
                  <th className="text-left p-4 font-medium text-gray-600">状态</th>
                  <th className="text-left p-4 font-medium text-gray-600">购买日期</th>
                </tr>
              </thead>
              <tbody>
                {enrollments
                  .filter((e) => {
                    if (filterEnrollStatus === 'low-hours') {
                      if (e.status !== 'active' || e.remainingHours > 5) return false;
                    } else if (filterEnrollStatus !== 'all' && e.status !== filterEnrollStatus) {
                      return false;
                    }
                    if (searchEnroll) {
                      const term = searchEnroll.toLowerCase();
                      return (
                        (e.player?.name || '').toLowerCase().includes(term) ||
                        (e.course?.name || '').toLowerCase().includes(term) ||
                        (e.player?.group || '').toLowerCase().includes(term)
                      );
                    }
                    return true;
                  })
                  .map((enrollment) => (
                  <tr key={enrollment.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white text-sm font-bold">
                          {enrollment.player?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {enrollment.player?.name || '未知'}
                          </div>
                          <div className="text-xs text-gray-500">{enrollment.player?.group}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-700">{enrollment.course?.name}</td>
                    <td className="p-4 text-gray-700">{enrollment.totalHours} 课时</td>
                    <td className="p-4 text-gray-700">{enrollment.usedHours} 课时</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            enrollment.remainingHours <= 3
                              ? 'text-red-600'
                              : enrollment.remainingHours <= 5
                                ? 'text-orange-600'
                                : 'text-green-600'
                          }`}
                        >
                          {enrollment.remainingHours} 课时
                        </span>
                        {enrollment.status === 'active' && enrollment.remainingHours <= 5 && enrollment.remainingHours > 0 && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      {/* 课时进度条 */}
                      {enrollment.totalHours > 0 && (
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              enrollment.remainingHours <= 3
                                ? 'bg-red-500'
                                : enrollment.remainingHours <= 5
                                  ? 'bg-orange-500'
                                  : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.max(0, (enrollment.remainingHours / enrollment.totalHours) * 100)}%`,
                            }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${statusMap[enrollment.status]?.color || 'bg-gray-100 text-gray-700'}`}
                      >
                        {statusMap[enrollment.status]?.label || enrollment.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-700">
                        {new Date(enrollment.purchaseDate).toLocaleDateString('zh-CN')}
                      </div>
                      {enrollment.expireDate && enrollment.status === 'active' && (
                        <div className="text-xs text-gray-400">
                          {new Date(enrollment.expireDate).toLocaleDateString('zh-CN')} 到期
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {enrollments.length === 0 && (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无购买记录</h3>
                <p className="text-gray-500">点击上方"购买课程"按钮为学员购买课程</p>
              </div>
            )}
          </div>
          </>
        )}
      </main>

      {/* 新建/编辑课程包弹窗 */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingCourse ? '编辑课程包' : '新建课程包'}
              </h2>
              <button
                onClick={() => {
                  setShowCourseModal(false);
                  resetCourseForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">课程包名称</label>
                <input
                  type="text"
                  value={courseForm.name}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="如：48课时半年卡"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                  <select
                    value={courseForm.type}
                    onChange={(e) =>
                      setCourseForm((prev) => ({
                        ...prev,
                        type: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="package">课时包</option>
                    <option value="monthly">月卡</option>
                    <option value="season">赛季卡</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">总课时</label>
                  <input
                    type="number"
                    value={courseForm.totalHours}
                    onChange={(e) =>
                      setCourseForm((prev) => ({
                        ...prev,
                        totalHours: Number(e.target.value),
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">价格(元)</label>
                  <input
                    type="number"
                    value={courseForm.price}
                    onChange={(e) =>
                      setCourseForm((prev) => ({
                        ...prev,
                        price: Number(e.target.value),
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">有效期(天)</label>
                  <input
                    type="number"
                    value={courseForm.validDays}
                    onChange={(e) =>
                      setCourseForm((prev) => ({
                        ...prev,
                        validDays: Number(e.target.value),
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">适用分组</label>
                <div className="flex flex-wrap gap-2">
                  {['U6', 'U8', 'U10', 'U12', 'U14'].map((group) => (
                    <button
                      key={group}
                      onClick={() => toggleGroup(group)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        courseForm.groups.includes(group)
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {group}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">不选则表示适用所有分组</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) =>
                    setCourseForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="课程包描述..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setShowCourseModal(false);
                  resetCourseForm();
                }}
                className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveCourse}
                className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 购买课程弹窗 */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">购买课程</h2>
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  resetEnrollForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择学员</label>
                <select
                  value={enrollForm.playerId}
                  onChange={(e) =>
                    setEnrollForm((prev) => ({
                      ...prev,
                      playerId: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">请选择学员</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name} ({player.group})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择课程包</label>
                <select
                  value={enrollForm.courseId}
                  onChange={(e) => {
                    const course = courses.find((c) => c.id === e.target.value);
                    setEnrollForm((prev) => ({
                      ...prev,
                      courseId: e.target.value,
                      totalHours: course?.totalHours || 0,
                    }));
                  }}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">请选择课程包</option>
                  {courses
                    .filter((c) => c.status === 'active')
                    .map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name} - {course.totalHours}课时 ¥{course.price}
                      </option>
                    ))}
                </select>
              </div>
              {enrollForm.courseId && (
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="text-sm text-orange-800">
                    <div className="font-medium mb-1">课程信息</div>
                    {courses.find((c) => c.id === enrollForm.courseId) && (
                      <>
                        <div>
                          有效期：
                          {courses.find((c) => c.id === enrollForm.courseId)?.validDays} 天
                        </div>
                        <div>从购买之日起开始计算</div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  resetEnrollForm();
                }}
                className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleEnroll}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                确认购买
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
