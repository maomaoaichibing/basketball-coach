'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Search,
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  MoreVertical,
  X,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Calendar,
  Trash2,
  Edit3,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { fetchWithAuth } from '@/lib/auth';

// 教练类型
interface Coach {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string | null;
  avatar: string | null;
  campusId: string | null;
  specialties: string;
  status: string;
  hireDate: string | null;
  notes: string | null;
  createdAt: string;
  campus: { id: string; name: string } | null;
}

// 表单数据类型
interface CoachFormData {
  name: string;
  phone: string;
  email: string;
  password: string;
  role: string;
  status: string;
  campusId: string;
  specialties: string;
  notes: string;
}

const emptyForm: CoachFormData = {
  name: '',
  phone: '',
  email: '',
  password: '',
  role: 'coach',
  status: 'active',
  campusId: '',
  specialties: '',
  notes: '',
};

export default function CoachesPage() {
  const { user, isLoading, token } = useAuth();
  const router = useRouter();

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPwdModal, setShowResetPwdModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 当前操作目标
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [formData, setFormData] = useState<CoachFormData>(emptyForm);
  const [resetPwdTarget, setResetPwdTarget] = useState<Coach | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coach | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);

  // 操作状态
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // 校区列表
  const [campuses, setCampuses] = useState<{ id: string; name: string }[]>([]);

  // 权限检查
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // 加载教练列表
  const fetchCoaches = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/coaches');
      const data = await res.json();
      if (data.success) {
        setCoaches(data.data);
      }
    } catch (error) {
      console.error('获取教练列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载校区列表
  useEffect(() => {
    async function fetchCampuses() {
      try {
        const res = await fetchWithAuth('/api/campuses');
        const data = await res.json();
        if (data.success) {
          setCampuses(data.campuses || []);
        }
      } catch {
        // ignore
      }
    }
    fetchCampuses();
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchCoaches();
    }
  }, [user, fetchCoaches]);

  // 表单操作
  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function openCreateModal() {
    setFormData(emptyForm);
    setSubmitMsg(null);
    setShowCreateModal(true);
  }

  function openEditModal(coach: Coach) {
    setEditingCoach(coach);
    setFormData({
      name: coach.name,
      phone: coach.phone,
      email: coach.email || '',
      password: '',
      role: coach.role || 'coach',
      status: coach.status || 'active',
      campusId: coach.campusId || '',
      specialties: coach.specialties || '',
      notes: coach.notes || '',
    });
    setSubmitMsg(null);
    setShowEditModal(true);
  }

  function openResetPwdModal(coach: Coach) {
    setResetPwdTarget(coach);
    setNewPassword('');
    setShowNewPwd(false);
    setSubmitMsg(null);
    setShowResetPwdModal(true);
  }

  function openDeleteConfirm(coach: Coach) {
    setDeleteTarget(coach);
    setShowDeleteConfirm(true);
  }

  // 提交创建
  async function handleCreate() {
    if (!formData.name.trim() || !formData.phone.trim()) {
      setSubmitMsg({ type: 'error', text: '姓名和手机号是必填项' });
      return;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setSubmitMsg({ type: 'error', text: '请输入有效的邮箱地址' });
      return;
    }
    if (formData.password && formData.password.length < 6) {
      setSubmitMsg({ type: 'error', text: '密码至少需要6个字符' });
      return;
    }

    setSubmitLoading(true);
    setSubmitMsg(null);
    try {
      const res = await fetchWithAuth('/api/coaches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          campusId: formData.campusId || undefined,
          email: formData.email || undefined,
          password: formData.password || undefined,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setSubmitMsg({ type: 'error', text: data.message || '创建失败' });
        return;
      }

      setShowCreateModal(false);
      fetchCoaches();
    } catch {
      setSubmitMsg({ type: 'error', text: '网络错误' });
    } finally {
      setSubmitLoading(false);
    }
  }

  // 提交编辑
  async function handleEdit() {
    if (!editingCoach) return;
    if (!formData.name.trim() || !formData.phone.trim()) {
      setSubmitMsg({ type: 'error', text: '姓名和手机号是必填项' });
      return;
    }

    setSubmitLoading(true);
    setSubmitMsg(null);
    try {
      const res = await fetchWithAuth(`/api/coaches/${editingCoach.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          role: formData.role,
          campusId: formData.campusId || null,
          specialties: formData.specialties,
          notes: formData.notes,
          status: formData.status || editingCoach.status,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setSubmitMsg({ type: 'error', text: data.message || '更新失败' });
        return;
      }

      setShowEditModal(false);
      fetchCoaches();
    } catch {
      setSubmitMsg({ type: 'error', text: '网络错误' });
    } finally {
      setSubmitLoading(false);
    }
  }

  // 重置密码
  async function handleResetPassword() {
    if (!resetPwdTarget) return;
    if (!newPassword || newPassword.length < 6) {
      setSubmitMsg({ type: 'error', text: '新密码至少需要6个字符' });
      return;
    }

    setSubmitLoading(true);
    setSubmitMsg(null);
    try {
      const res = await fetchWithAuth(`/api/coaches/${resetPwdTarget.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();

      if (!data.success) {
        setSubmitMsg({ type: 'error', text: data.message || '重置失败' });
        return;
      }

      setShowResetPwdModal(false);
    } catch {
      setSubmitMsg({ type: 'error', text: '网络错误' });
    } finally {
      setSubmitLoading(false);
    }
  }

  // 删除教练
  async function handleDelete() {
    if (!deleteTarget) return;

    setSubmitLoading(true);
    try {
      const res = await fetchWithAuth(`/api/coaches/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!data.success) {
        setSubmitMsg({ type: 'error', text: data.message || '删除失败' });
        return;
      }

      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      fetchCoaches();
    } catch {
      setSubmitMsg({ type: 'error', text: '网络错误' });
    } finally {
      setSubmitLoading(false);
    }
  }

  // 筛选
  const filteredCoaches = coaches.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  // 状态标签颜色
  function statusBadge(status: string) {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'on_vacation':
        return 'bg-yellow-100 text-yellow-700';
      case 'left':
        return 'bg-gray-100 text-gray-500';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  }

  function statusLabel(status: string) {
    switch (status) {
      case 'active':
        return '在职';
      case 'on_vacation':
        return '休假中';
      case 'left':
        return '已离职';
      default:
        return status;
    }
  }

  // 加载中
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // 非管理员
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900">教练管理</h1>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-12 text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">权限不足</h2>
          <p className="text-gray-500 mb-6">教练管理功能仅对管理员开放</p>
          <Link href="/" className="text-orange-600 hover:text-orange-700">
            返回首页
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900">教练管理</h1>
              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                {coaches.length} 人
              </span>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加教练
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 搜索栏 */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索姓名、手机号、邮箱..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        {/* 教练列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredCoaches.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? '没有找到匹配的教练' : '暂无教练'}
            </h3>
            <p className="text-gray-500">
              {searchQuery ? '试试其他搜索关键词' : '点击"添加教练"创建第一个教练账号'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCoaches.map(coach => (
              <div
                key={coach.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* 头像 */}
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-5 h-5 text-orange-600" />
                    </div>
                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{coach.name}</span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusBadge(coach.status)}`}
                        >
                          {statusLabel(coach.status)}
                        </span>
                        {coach.role === 'admin' && (
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
                            管理员
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {coach.phone}
                        </span>
                        {coach.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {coach.email}
                          </span>
                        )}
                        {coach.campus && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {coach.campus.name}
                          </span>
                        )}
                        {coach.hireDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(coach.hireDate).toLocaleDateString('zh-CN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮（非自己才能操作） */}
                  {coach.id !== user.id && (
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => openEditModal(coach)}
                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openResetPwdModal(coach)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="重置密码"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(coach)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ===== 创建教练弹窗 ===== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">添加教练</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="教练姓名"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  手机号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  placeholder="11位手机号"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  placeholder="可选，用于登录"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">初始密码</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleFormChange}
                  placeholder="留空则默认 123456"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">角色</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="coach">普通教练</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              {campuses.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">所属校区</label>
                  <select
                    name="campusId"
                    value={formData.campusId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">未分配</option>
                    {campuses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">备注</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  placeholder="可选备注"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                />
              </div>

              {submitMsg && (
                <div
                  className={`p-3 rounded-xl text-sm ${submitMsg.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}
                >
                  {submitMsg.text}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  disabled={submitLoading}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl disabled:opacity-50 text-sm transition-colors"
                >
                  {submitLoading ? '创建中...' : '创建'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 编辑教练弹窗 ===== */}
      {showEditModal && editingCoach && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">编辑教练</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  手机号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">角色</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="coach">普通教练</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">状态</label>
                <select
                  name="status"
                  value={formData.status || editingCoach.status}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="active">在职</option>
                  <option value="on_vacation">休假中</option>
                  <option value="left">已离职</option>
                </select>
              </div>
              {campuses.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">所属校区</label>
                  <select
                    name="campusId"
                    value={formData.campusId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">未分配</option>
                    {campuses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">备注</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                />
              </div>

              {submitMsg && (
                <div
                  className={`p-3 rounded-xl text-sm ${submitMsg.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}
                >
                  {submitMsg.text}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleEdit}
                  disabled={submitLoading}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl disabled:opacity-50 text-sm transition-colors"
                >
                  {submitLoading ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 重置密码弹窗 ===== */}
      {showResetPwdModal && resetPwdTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">重置密码</h3>
              <button
                onClick={() => setShowResetPwdModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-500">
                为 <span className="font-medium text-gray-900">{resetPwdTarget.name}</span>{' '}
                设置新密码：
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">新密码</label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="至少6个字符"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {submitMsg && (
                <div
                  className={`p-3 rounded-xl text-sm ${submitMsg.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}
                >
                  {submitMsg.text}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowResetPwdModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={submitLoading}
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl disabled:opacity-50 text-sm transition-colors"
                >
                  {submitLoading ? '重置中...' : '确认重置'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 删除确认弹窗 ===== */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
              <p className="text-gray-500 text-sm mb-6">
                确定要删除教练{' '}
                <span className="font-medium text-gray-900">{deleteTarget.name}</span>{' '}
                吗？此操作不可撤销。
              </p>

              {submitMsg && (
                <div className="mb-4 p-3 bg-red-50 rounded-xl text-red-600 text-sm">
                  {submitMsg.text}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSubmitMsg(null);
                  }}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  disabled={submitLoading}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl disabled:opacity-50 text-sm transition-colors"
                >
                  {submitLoading ? '删除中...' : '确认删除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
