'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Users,
  Mail,
  Phone,
  Shield,
  Building2,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  X,
  Camera,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { fetchWithAuth } from '@/lib/auth';

export default function SettingsPage() {
  const { user, logout, token, refreshUser } = useAuth();
  const router = useRouter();

  // 修改密码状态
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);

  // 编辑资料状态
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editing, setEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 头像上传状态
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleLogout() {
    logout();
    router.push('/');
  }

  function startEditing() {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditing(true);
    setEditMsg(null);
  }

  async function handleSaveProfile() {
    setEditLoading(true);
    setEditMsg(null);
    try {
      const res = await fetchWithAuth('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editName, phone: editPhone || undefined }),
      });
      const data = await res.json();
      if (!data.success) {
        setEditMsg({ type: 'error', text: data.message || '更新失败' });
        return;
      }
      await refreshUser();
      setEditMsg({ type: 'success', text: '资料已更新' });
      setTimeout(() => {
        setEditing(false);
        setEditMsg(null);
      }, 1000);
    } catch {
      setEditMsg({ type: 'error', text: '网络错误' });
    } finally {
      setEditLoading(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 前端验证
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setAvatarError('仅支持 JPG、PNG、GIF、WebP 格式');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('头像文件不能超过 2MB');
      return;
    }

    setAvatarUploading(true);
    setAvatarError('');

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetchWithAuth('/api/auth/avatar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json();

      if (!data.success) {
        setAvatarError(data.message || '上传失败');
        return;
      }

      // 刷新用户信息以获取新头像
      await refreshUser();
    } catch {
      setAvatarError('上传失败，请重试');
    } finally {
      setAvatarUploading(false);
      // 清空 file input 以便重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess(false);

    if (newPassword !== confirmPassword) {
      setPwdError('两次输入的新密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError('新密码长度至少6位');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetchWithAuth('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();

      if (!data.success) {
        setPwdError(data.message || '修改失败');
        return;
      }

      setPwdSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPwdSuccess(false);
      }, 1500);
    } catch {
      setPwdError('网络错误，请重试');
    } finally {
      setPwdLoading(false);
    }
  }

  // 未登录时显示提示
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900">设置</h1>
            </div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-12 text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">未登录</h2>
          <p className="text-gray-500 mb-6">请先登录后查看个人设置</p>
          <Link
            href="/login"
            className="inline-block px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors"
          >
            去登录
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">设置</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* 个人信息卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">个人信息</h2>
            {!editing && (
              <button
                onClick={startEditing}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                编辑
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {/* 头像和名字 */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative group cursor-pointer flex-shrink-0"
                title="点击更换头像"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt="头像"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-orange-600" />
                  </div>
                )}
                {/* 上传遮罩 */}
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {avatarUploading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <div className="flex-1 min-w-0">
                {editing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="姓名"
                  />
                ) : (
                  <>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </>
                )}
              </div>
              {!editing && (
                <span className="px-2.5 py-1 text-xs bg-orange-100 text-orange-700 rounded-full font-medium flex-shrink-0">
                  {user.role === 'admin' ? '管理员' : '教练'}
                </span>
              )}
            </div>
            {/* 头像上传错误提示 */}
            {avatarError && (
              <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-red-600 text-sm">
                {avatarError}
              </div>
            )}

            {/* 邮箱 */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-gray-500">邮箱</div>
                <div className="text-gray-900">{user.email}</div>
              </div>
            </div>

            {/* 手机号 */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-gray-500">手机号</div>
                {editing ? (
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mt-0.5"
                    placeholder="可选"
                  />
                ) : (
                  <div className="text-gray-900">{user.phone || '未设置'}</div>
                )}
              </div>
            </div>

            {/* 校区 */}
            {user.campusName && (
              <div className="flex items-center gap-3 px-4 py-3.5">
                <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500">所属校区</div>
                  <div className="text-gray-900">{user.campusName}</div>
                </div>
              </div>
            )}

            {/* 状态 */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Shield className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-gray-500">账号状态</div>
                <div className="text-green-600 font-medium">正常</div>
              </div>
            </div>

            {/* 编辑操作按钮 */}
            {editing && (
              <div className="px-4 py-3.5 flex items-center gap-3">
                {editMsg && (
                  <span className={`text-sm ${editMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {editMsg.text}
                  </span>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => { setEditing(false); setEditMsg(null); }}
                  className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={editLoading || !editName.trim()}
                  className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {editLoading ? '保存中...' : '保存'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 账号安全 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">账号安全</h2>
          </div>
          <div className="divide-y divide-gray-100">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center justify-between w-full px-4 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">修改密码</span>
              </div>
              <span className="text-gray-400 text-sm">›</span>
            </button>
          </div>
        </div>

        {/* 管理员功能 */}
        {user.role === 'admin' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">管理员功能</h2>
            </div>
            <div className="divide-y divide-gray-100">
              <Link
                href="/coaches"
                className="flex items-center justify-between w-full px-4 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">教练管理</span>
                </div>
                <span className="text-gray-400 text-sm">›</span>
              </Link>
            </div>
          </div>
        )}

        {/* 系统设置 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-700">语言</span>
            <span className="text-gray-500">简体中文</span>
          </div>
        </div>

        {/* 退出登录 */}
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3.5 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">退出登录</span>
        </button>

        <div className="text-center text-xs text-gray-400 py-4">
          篮球青训教案系统 v4.9
        </div>
      </main>

      {/* 修改密码弹窗 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">修改密码</h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPwdError('');
                  setPwdSuccess(false);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {pwdSuccess ? (
              <div className="px-6 py-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-900 font-medium">密码修改成功</p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">旧密码</label>
                  <div className="relative">
                    <input
                      type={showOldPwd ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      placeholder="请输入旧密码"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPwd(!showOldPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showOldPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">新密码</label>
                  <div className="relative">
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="至少6个字符"
                      required
                      minLength={6}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-10"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">确认新密码</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="再次输入新密码"
                    required
                    minLength={6}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                {pwdError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    {pwdError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPwdError('');
                    }}
                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={pwdLoading}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl disabled:opacity-50 transition-colors"
                  >
                    {pwdLoading ? '修改中...' : '确认修改'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
