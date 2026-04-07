'use client';

import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/auth';
import {
  Bell,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  Eye,
  Plus,
  Filter,
  RefreshCw,
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  channel: string;
  player?: { id: string; name: string };
  guardianName: string | null;
  template?: { id: string; code: string; name: string };
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

interface Player {
  id: string;
  name: string;
  parentPhone: string | null;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState({ status: '', type: '', playerId: '' });
  const [showModal, setShowModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 新建通知表单
  const [newNotification, setNewNotification] = useState({
    playerId: '',
    guardianName: '',
    title: '',
    content: '',
    type: 'system',
  });

  useEffect(() => {
    fetchNotifications();
    fetchPlayers();
  }, [filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      if (filter.type) params.set('type', filter.type);
      if (filter.playerId) params.set('playerId', filter.playerId);

      const res = await fetchWithAuth(`/api/notifications?${params}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('获取通知失败:', error);
    }
    setLoading(false);
  };

  const fetchPlayers = async () => {
    try {
      const res = await fetchWithAuth('/api/players?status=training');
      const data = await res.json();
      setPlayers(data.players || []);
    } catch (error) {
      console.error('获取学员失败:', error);
    }
  };

  const handleCreateNotification = async () => {
    try {
      const res = await fetchWithAuth('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNotification),
      });

      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchNotifications();
      }
    } catch (error) {
      console.error('创建通知失败:', error);
    }
  };

  const resetForm = () => {
    setNewNotification({
      playerId: '',
      guardianName: '',
      title: '',
      content: '',
      type: 'system',
    });
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.status === 'read') return;

    try {
      await fetchWithAuth(`/api/notifications/${notification.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'read' }),
      });
      fetchNotifications();
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  const handleDelete = async (notification: Notification) => {
    if (!confirm('确定要删除该通知吗？')) return;

    try {
      await fetchWithAuth(`/api/notifications/${notification.id}`, {
        method: 'DELETE',
      });
      fetchNotifications();
    } catch (error) {
      console.error('删除通知失败:', error);
    }
  };

  const handleSendReminder = async () => {
    try {
      const res = await fetch('/api/notifications/check');
      const data = await res.json();
      alert(data.summary || '检查完成');
      fetchNotifications();
    } catch (error) {
      console.error('发送提醒失败:', error);
    }
  };

  const openDetailModal = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
    if (notification.status !== 'read') {
      handleMarkAsRead(notification);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-blue-100 text-blue-800',
      read: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      pending: '待发送',
      sent: '已发送',
      read: '已读',
      failed: '失败',
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs ${badges[status] || 'bg-gray-100 text-gray-800'}`}
      >
        {labels[status] || status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      system: 'bg-gray-100 text-gray-700',
      course: 'bg-blue-100 text-blue-700',
      reminder: 'bg-orange-100 text-orange-700',
      marketing: 'bg-purple-100 text-purple-700',
    };
    const labels: Record<string, string> = {
      system: '系统',
      course: '课程',
      reminder: '提醒',
      marketing: '营销',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
        {labels[type] || type}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">通知管理</h1>
                <p className="text-sm text-gray-500">
                  {unreadCount > 0 ? `${unreadCount} 条未读通知` : '暂无未读通知'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSendReminder}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                发送自动提醒
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                发送通知
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4">
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">全部状态</option>
            <option value="pending">待发送</option>
            <option value="sent">已发送</option>
            <option value="read">已读</option>
          </select>
          <select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">全部类型</option>
            <option value="system">系统</option>
            <option value="course">课程</option>
            <option value="reminder">提醒</option>
            <option value="marketing">营销</option>
          </select>
          <select
            value={filter.playerId}
            onChange={(e) => setFilter({ ...filter, playerId: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">全部学员</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setFilter({ status: '', type: '', playerId: '' })}
            className="px-3 py-2 text-gray-600 hover:text-gray-800"
          >
            清除筛选
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>暂无通知</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    notification.status !== 'read' ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {notification.status === 'read' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : notification.status === 'failed' ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </h3>
                        {getTypeBadge(notification.type)}
                        {getStatusBadge(notification.status)}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                        {notification.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        {notification.player && <span>学员: {notification.player.name}</span>}
                        {notification.guardianName && (
                          <span>监护人: {notification.guardianName}</span>
                        )}
                        {notification.sentAt && (
                          <span>发送于: {new Date(notification.sentAt).toLocaleString()}</span>
                        )}
                        {!notification.sentAt && (
                          <span>创建于: {new Date(notification.createdAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openDetailModal(notification)}
                        className="p-2 text-gray-400 hover:text-blue-600"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(notification)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Notification Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-bold">发送通知</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">学员</label>
                <select
                  value={newNotification.playerId}
                  onChange={(e) =>
                    setNewNotification({
                      ...newNotification,
                      playerId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">请选择学员</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name} {player.parentPhone ? `(${player.parentPhone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">监护人姓名</label>
                <input
                  type="text"
                  value={newNotification.guardianName}
                  onChange={(e) =>
                    setNewNotification({
                      ...newNotification,
                      guardianName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="输入监护人姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">通知类型</label>
                <select
                  value={newNotification.type}
                  onChange={(e) =>
                    setNewNotification({
                      ...newNotification,
                      type: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="system">系统通知</option>
                  <option value="course">课程通知</option>
                  <option value="reminder">提醒</option>
                  <option value="marketing">营销</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">通知标题</label>
                <input
                  type="text"
                  value={newNotification.title}
                  onChange={(e) =>
                    setNewNotification({
                      ...newNotification,
                      title: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="输入通知标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">通知内容</label>
                <textarea
                  value={newNotification.content}
                  onChange={(e) =>
                    setNewNotification({
                      ...newNotification,
                      content: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={4}
                  placeholder="输入通知内容"
                />
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleCreateNotification}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg m-4">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-bold">通知详情</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">标题</label>
                <p className="text-gray-900">{selectedNotification.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">内容</label>
                <p className="text-gray-900 whitespace-pre-wrap">{selectedNotification.content}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">类型</label>
                  <p className="text-gray-900">{getTypeBadge(selectedNotification.type)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">状态</label>
                  <p className="mt-1">{getStatusBadge(selectedNotification.status)}</p>
                </div>
              </div>
              {selectedNotification.player && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">学员</label>
                  <p className="text-gray-900">{selectedNotification.player.name}</p>
                </div>
              )}
              {selectedNotification.guardianName && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">监护人</label>
                  <p className="text-gray-900">{selectedNotification.guardianName}</p>
                </div>
              )}
              {selectedNotification.template && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">关联模板</label>
                  <p className="text-gray-900">{selectedNotification.template.name}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">发送时间</label>
                  <p className="text-gray-900">
                    {selectedNotification.sentAt
                      ? new Date(selectedNotification.sentAt).toLocaleString()
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">阅读时间</label>
                  <p className="text-gray-900">
                    {selectedNotification.readAt
                      ? new Date(selectedNotification.readAt).toLocaleString()
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
