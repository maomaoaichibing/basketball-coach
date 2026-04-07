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
  FileText,
  BarChart3,
  Users,
  Zap,
  Edit3,
  ToggleLeft,
  ToggleRight,
  Tag,
} from 'lucide-react';

// ========== 类型定义 ==========

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

interface NotificationTemplate {
  id: string;
  code: string;
  name: string;
  category: string;
  title: string;
  content: string;
  variables: string;
  isActive: boolean;
  isAutomated: boolean;
  priority: string;
}

interface NotificationStats {
  total: number;
  pending: number;
  sent: number;
  read: number;
  failed: number;
  unreadRate: number;
  readRate: number;
  todaySent: number;
  weekSent: number;
  byType: Record<string, number>;
  byChannel: Record<string, number>;
}

type Tab = 'list' | 'templates' | 'stats';

// ========== 状态标签 ==========

const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: '待发送', class: 'bg-yellow-100 text-yellow-800' },
  sent: { label: '已发送', class: 'bg-blue-100 text-blue-800' },
  read: { label: '已读', class: 'bg-green-100 text-green-800' },
  failed: { label: '失败', class: 'bg-red-100 text-red-800' },
};

const typeConfig: Record<string, { label: string; class: string }> = {
  system: { label: '系统', class: 'bg-gray-100 text-gray-700' },
  course: { label: '课程', class: 'bg-blue-100 text-blue-700' },
  reminder: { label: '提醒', class: 'bg-orange-100 text-orange-700' },
  marketing: { label: '营销', class: 'bg-purple-100 text-purple-700' },
};

const categoryConfig: Record<string, { label: string; class: string }> = {
  system: { label: '系统', class: 'bg-gray-100 text-gray-700' },
  course: { label: '课程', class: 'bg-blue-100 text-blue-700' },
  reminder: { label: '提醒', class: 'bg-orange-100 text-orange-700' },
  marketing: { label: '营销', class: 'bg-purple-100 text-purple-700' },
};

const priorityConfig: Record<string, { label: string; class: string }> = {
  low: { label: '低', class: 'bg-gray-100 text-gray-600' },
  normal: { label: '普通', class: 'bg-blue-100 text-blue-700' },
  high: { label: '高', class: 'bg-orange-100 text-orange-700' },
  urgent: { label: '紧急', class: 'bg-red-100 text-red-700' },
};

// ========== 主组件 ==========

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('list');

  // 通知列表状态
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState({ status: '', type: '', playerId: '' });
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 模板状态
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

  // 统计状态
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // 新建通知表单
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNotification, setNewNotification] = useState({
    playerId: '',
    guardianName: '',
    title: '',
    content: '',
    type: 'system',
  });

  // 批量发送状态
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    selectedPlayerIds: [] as string[],
    title: '',
    content: '',
    type: 'system',
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchPlayers();
  }, [filter]);

  // ========== 通知列表逻辑 ==========

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
        setShowCreateModal(false);
        setNewNotification({ playerId: '', guardianName: '', title: '', content: '', type: 'system' });
        fetchNotifications();
      }
    } catch (error) {
      console.error('创建通知失败:', error);
    }
  };

  const handleBulkSend = async () => {
    if (bulkForm.selectedPlayerIds.length === 0 || !bulkForm.title || !bulkForm.content) return;
    setSending(true);
    try {
      const res = await fetchWithAuth('/api/notifications/trigger/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkForm),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`发送成功！${data.message}`);
        setShowBulkModal(false);
        setBulkForm({ selectedPlayerIds: [], title: '', content: '', type: 'system' });
        fetchNotifications();
      }
    } catch (error) {
      console.error('批量发送失败:', error);
    }
    setSending(false);
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
      await fetchWithAuth(`/api/notifications/${notification.id}`, { method: 'DELETE' });
      fetchNotifications();
    } catch (error) {
      console.error('删除通知失败:', error);
    }
  };

  const handleSendReminder = async () => {
    try {
      const res = await fetchWithAuth('/api/notifications/check');
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

  // ========== 模板逻辑 ==========

  const fetchTemplates = async () => {
    setTemplateLoading(true);
    try {
      const res = await fetchWithAuth('/api/notification-templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('获取模板失败:', error);
    }
    setTemplateLoading(false);
  };

  const handleToggleTemplate = async (template: NotificationTemplate) => {
    try {
      await fetchWithAuth(`/api/notification-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...template, isActive: !template.isActive }),
      });
      fetchTemplates();
    } catch (error) {
      console.error('切换模板状态失败:', error);
    }
  };

  const handleEditTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    try {
      await fetchWithAuth(`/api/notification-templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTemplate),
      });
      setShowTemplateModal(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('保存模板失败:', error);
    }
  };

  // ========== 统计逻辑 ==========

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetchWithAuth('/api/notifications/stats');
      const data = await res.json();
      setStats(data.stats || null);
    } catch (error) {
      console.error('获取统计失败:', error);
    }
    setStatsLoading(false);
  };

  // ========== Tab 切换时加载数据 ==========

  useEffect(() => {
    if (activeTab === 'templates' && templates.length === 0) fetchTemplates();
    if (activeTab === 'stats') fetchStats();
  }, [activeTab]);

  // ========== 渲染 ==========

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
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
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleSendReminder}
                className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-1.5 text-sm"
              >
                <Zap className="w-4 h-4" />
                自动检查
              </button>
              <button
                onClick={() => setShowBulkModal(true)}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1.5 text-sm"
              >
                <Users className="w-4 h-4" />
                批量发送
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 text-sm"
              >
                <Plus className="w-4 h-4" />
                发送通知
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="bg-white rounded-lg shadow p-1 flex gap-1">
          {[
            { key: 'list' as Tab, label: '通知列表', icon: Bell },
            { key: 'templates' as Tab, label: '通知模板', icon: FileText },
            { key: 'stats' as Tab, label: '数据统计', icon: BarChart3 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ========== Tab: 通知列表 ========== */}
      {activeTab === 'list' && (
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          {/* 筛选 */}
          <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-3">
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">全部状态</option>
              <option value="pending">待发送</option>
              <option value="sent">已发送</option>
              <option value="read">已读</option>
              <option value="failed">失败</option>
            </select>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
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
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">全部学员</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={() => setFilter({ status: '', type: '', playerId: '' })}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              清除筛选
            </button>
          </div>

          {/* 列表 */}
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
                {notifications.map((notif) => {
                  const sc = statusConfig[notif.status] || statusConfig.pending;
                  const tc = typeConfig[notif.type] || typeConfig.system;
                  return (
                    <div
                      key={notif.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        notif.status !== 'read' ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {notif.status === 'read' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : notif.status === 'failed' ? (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <Clock className="w-5 h-5 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {notif.title}
                            </h3>
                            <span className={`px-2 py-0.5 rounded text-xs ${tc.class}`}>{tc.label}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${sc.class}`}>{sc.label}</span>
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-2 mb-2">{notif.content}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                            {notif.player && <span>学员: {notif.player.name}</span>}
                            {notif.guardianName && <span>监护人: {notif.guardianName}</span>}
                            {notif.sentAt && <span>发送于: {new Date(notif.sentAt).toLocaleString()}</span>}
                            {!notif.sentAt && <span>创建于: {new Date(notif.createdAt).toLocaleString()}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openDetailModal(notif)} className="p-2 text-gray-400 hover:text-blue-600" title="查看详情">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(notif)} className="p-2 text-gray-400 hover:text-red-600" title="删除">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== Tab: 通知模板 ========== */}
      {activeTab === 'templates' && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">通知模板管理</h2>
              <button onClick={fetchTemplates} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5" /> 刷新
              </button>
            </div>
            {templateLoading ? (
              <div className="p-8 text-center text-gray-500">加载中...</div>
            ) : templates.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>暂无模板</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {templates.map((t) => {
                  const cc = categoryConfig[t.category] || categoryConfig.system;
                  const pc = priorityConfig[t.priority] || priorityConfig.normal;
                  return (
                    <div key={t.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-sm font-medium text-gray-900">{t.name}</h3>
                            <span className="text-xs text-gray-400 font-mono">{t.code}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${cc.class}`}>{cc.label}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${pc.class}`}>{pc.label}</span>
                            {t.isAutomated && (
                              <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">自动</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mb-1">
                            <span className="font-medium text-gray-700">标题：</span>{t.title}
                          </p>
                          <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                            <span className="font-medium text-gray-700">内容：</span>{t.content}
                          </p>
                          <div className="flex gap-1 flex-wrap">
                            {(() => {
                              try {
                                const vars = JSON.parse(t.variables);
                                return vars.map((v: string) => (
                                  <span key={v} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs font-mono">
                                    {`{{${v}}}`}
                                  </span>
                                ));
                              } catch {
                                return null;
                              }
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleTemplate(t)}
                            className="p-2 text-gray-400 hover:text-orange-600"
                            title={t.isActive ? '停用' : '启用'}
                          >
                            {t.isActive ? <ToggleRight className="w-5 h-5 text-orange-500" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => handleEditTemplate(t)}
                            className="p-2 text-gray-400 hover:text-blue-600"
                            title="编辑"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== Tab: 数据统计 ========== */}
      {activeTab === 'stats' && (
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          {statsLoading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">加载中...</div>
          ) : stats ? (
            <>
              {/* 概览卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: '总通知', value: stats.total, icon: Bell, color: 'bg-gray-100 text-gray-600' },
                  { label: '今日发送', value: stats.todaySent, icon: Send, color: 'bg-blue-100 text-blue-600' },
                  { label: '本周发送', value: stats.weekSent, icon: Zap, color: 'bg-orange-100 text-orange-600' },
                  { label: '已读率', value: `${stats.readRate}%`, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{value}</p>
                        <p className="text-xs text-gray-500">{label}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 状态分布 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">状态分布</h3>
                <div className="space-y-3">
                  {[
                    { label: '待发送', count: stats.pending, color: 'bg-yellow-500' },
                    { label: '已发送', count: stats.sent, color: 'bg-blue-500' },
                    { label: '已读', count: stats.read, color: 'bg-green-500' },
                    { label: '失败', count: stats.failed, color: 'bg-red-500' },
                  ].map(({ label, count, color }) => {
                    const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">{label}</span>
                          <span className="font-medium text-gray-900">{count} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 类型分布 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">类型分布</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(stats.byType).map(([type, count]) => {
                    const tc = typeConfig[type] || { label: type, class: 'bg-gray-100 text-gray-700' };
                    return (
                      <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className={`px-2 py-0.5 rounded text-xs ${tc.class}`}>{tc.label}</span>
                        <span className="font-medium text-gray-900">{count} 条</span>
                      </div>
                    );
                  })}
                  {Object.keys(stats.byType).length === 0 && (
                    <p className="text-gray-500 text-sm col-span-2">暂无数据</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">暂无统计数据</div>
          )}
        </div>
      )}

      {/* ========== 模态框: 创建通知 ========== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-bold">发送通知</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">学员</label>
                <select
                  value={newNotification.playerId}
                  onChange={(e) => setNewNotification({ ...newNotification, playerId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">请选择学员</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.parentPhone ? `(${p.parentPhone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">监护人姓名</label>
                <input
                  type="text"
                  value={newNotification.guardianName}
                  onChange={(e) => setNewNotification({ ...newNotification, guardianName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="输入监护人姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">通知类型</label>
                <select
                  value={newNotification.type}
                  onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value })}
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
                  onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="输入通知标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">通知内容</label>
                <textarea
                  value={newNotification.content}
                  onChange={(e) => setNewNotification({ ...newNotification, content: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={4}
                  placeholder={'输入通知内容，支持 {{playerName}} 变量'}
                />
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
                取消
              </button>
              <button
                onClick={handleCreateNotification}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> 发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 模态框: 批量发送 ========== */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg m-4">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">批量发送通知</h2>
              <span className="text-sm text-gray-500">已选 {bulkForm.selectedPlayerIds.length} 人</span>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择学员</label>
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  <label className="flex items-center gap-2 px-3 py-2 border-b bg-gray-50 sticky top-0">
                    <input
                      type="checkbox"
                      checked={bulkForm.selectedPlayerIds.length === players.length && players.length > 0}
                      onChange={(e) =>
                        setBulkForm({
                          ...bulkForm,
                          selectedPlayerIds: e.target.checked ? players.map((p) => p.id) : [],
                        })
                      }
                    />
                    <span className="text-sm font-medium text-gray-700">全选</span>
                  </label>
                  {players.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 px-3 py-2 border-b last:border-0 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={bulkForm.selectedPlayerIds.includes(p.id)}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...bulkForm.selectedPlayerIds, p.id]
                            : bulkForm.selectedPlayerIds.filter((id) => id !== p.id);
                          setBulkForm({ ...bulkForm, selectedPlayerIds: ids });
                        }}
                      />
                      <span className="text-sm text-gray-700">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">通知类型</label>
                <select
                  value={bulkForm.type}
                  onChange={(e) => setBulkForm({ ...bulkForm, type: e.target.value })}
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
                  value={bulkForm.title}
                  onChange={(e) => setBulkForm({ ...bulkForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="输入通知标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">通知内容</label>
                <textarea
                  value={bulkForm.content}
                  onChange={(e) => setBulkForm({ ...bulkForm, content: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={4}
                  placeholder={'输入通知内容，支持 {{playerName}} 变量自动替换学员姓名'}
                />
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleBulkSend}
                disabled={sending || bulkForm.selectedPlayerIds.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    发送中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> 批量发送 ({bulkForm.selectedPlayerIds.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 模态框: 通知详情 ========== */}
      {showDetailModal && selectedNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
                  <span className={`px-2 py-0.5 rounded text-xs ${(typeConfig[selectedNotification.type] || typeConfig.system).class}`}>
                    {(typeConfig[selectedNotification.type] || typeConfig.system).label}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">状态</label>
                  <span className={`px-2 py-0.5 rounded text-xs ${(statusConfig[selectedNotification.status] || statusConfig.pending).class}`}>
                    {(statusConfig[selectedNotification.status] || statusConfig.pending).label}
                  </span>
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
                    {selectedNotification.sentAt ? new Date(selectedNotification.sentAt).toLocaleString() : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">阅读时间</label>
                  <p className="text-gray-900">
                    {selectedNotification.readAt ? new Date(selectedNotification.readAt).toLocaleString() : '-'}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 模态框: 编辑模板 ========== */}
      {showTemplateModal && editingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg m-4">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-bold">编辑模板: {editingTemplate.name}</h2>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模板名称</label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">通知标题</label>
                <input
                  type="text"
                  value={editingTemplate.title}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">通知内容</label>
                <textarea
                  value={editingTemplate.content}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  rows={5}
                />
                <p className="text-xs text-gray-400 mt-1">{'支持变量: {{guardianName}}, {{playerName}}, {{courseName}} 等'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                <select
                  value={editingTemplate.category}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="system">系统</option>
                  <option value="course">课程</option>
                  <option value="reminder">提醒</option>
                  <option value="marketing">营销</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                <select
                  value={editingTemplate.priority}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, priority: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="low">低</option>
                  <option value="normal">普通</option>
                  <option value="high">高</option>
                  <option value="urgent">紧急</option>
                </select>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowTemplateModal(false); setEditingTemplate(null); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> 保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
