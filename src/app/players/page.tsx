'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/auth';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  Download,
  Edit2,
  FileSpreadsheet,
  Filter,
  MapPin,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Star,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  X,
} from 'lucide-react';

// 长按功能使用原生事件实现，不再需要 @use-gesture/react

// 学员类型
type Player = {
  id: string;
  name: string;
  group: string;
  gender: string;
  birthDate: string;
  age: number;
  status: string;
  school: string;
  parentName: string;
  parentPhone: string;
  parentWechat: string;
  team: { id: string; name: string } | null;
  guardians: Guardian[];
  trainingCount: number;
  assessmentCount: number;
};

type Guardian = {
  id: string;
  name: string;
  relation: string;
  mobile: string;
  isPrimary: boolean;
};

const groups = ['all', 'U6', 'U8', 'U10', 'U12', 'U14'];
const statuses = [
  { value: 'all', label: '全部状态' },
  { value: 'trial', label: '试听中' },
  { value: 'training', label: '在训' },
  { value: 'vacation', label: '请假' },
  { value: 'suspended', label: '停课' },
  { value: 'graduated', label: '结业' },
];

const statusColors: Record<string, string> = {
  trial: 'bg-purple-100 text-purple-700',
  training: 'bg-green-100 text-green-700',
  vacation: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-gray-100 text-gray-700',
  graduated: 'bg-blue-100 text-blue-700',
};

const statusLabels: Record<string, string> = {
  trial: '试听',
  training: '在训',
  vacation: '请假',
  suspended: '停课',
  graduated: '结业',
};

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    total?: number;
    created?: number;
    failed?: number;
    message?: string;
    errors?: { row: number; message?: string; name?: string; error?: string; type?: string }[];
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // 长按快捷菜单
  const [longPressMenu, setLongPressMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    player: Player | null;
  }>({ show: false, x: 0, y: 0, player: null });

  // 新建/编辑表单
  const [formData, setFormData] = useState({
    name: '',
    gender: 'male',
    birthDate: '',
    group: 'U10',
    status: 'training',
    school: '',
    parentName: '',
    parentPhone: '',
    parentWechat: '',
  });

  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (groupFilter !== 'all') params.set('group', groupFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const response = await fetchWithAuth(`/api/players?${params}`);
      const data = await response.json();

      if (data.success) {
        setPlayers(data.players);
      }
    } catch (error) {
      console.error('获取学员列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [groupFilter, statusFilter, search]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  useEffect(() => {
    fetchPlayers();
  }, [groupFilter, statusFilter, fetchPlayers]);

  const handleSearch = () => {
    fetchPlayers();
  };

  const handleAddPlayer = async () => {
    if (!formData.name || !formData.birthDate) {
      alert('请填写姓名和出生日期');
      return;
    }

    try {
      const response = await fetchWithAuth('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setShowAddModal(false);
        setFormData({
          name: '',
          gender: 'male',
          birthDate: '',
          group: 'U10',
          status: 'training',
          school: '',
          parentName: '',
          parentPhone: '',
          parentWechat: '',
        });
        fetchPlayers();
      } else {
        alert(data.error || '创建失败');
      }
    } catch (error) {
      console.error('创建学员失败:', error);
      alert('创建学员失败');
    }
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      gender: player.gender,
      birthDate: player.birthDate.split('T')[0],
      group: player.group,
      status: player.status,
      school: player.school || '',
      parentName: player.parentName || '',
      parentPhone: player.parentPhone || '',
      parentWechat: player.parentWechat || '',
    });
    setShowAddModal(true);
  };

  const handleUpdatePlayer = async () => {
    if (!editingPlayer || !formData.name || !formData.birthDate) {
      alert('请填写姓名和出生日期');
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/players/${editingPlayer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setShowAddModal(false);
        setEditingPlayer(null);
        setFormData({
          name: '',
          gender: 'male',
          birthDate: '',
          group: 'U10',
          status: 'training',
          school: '',
          parentName: '',
          parentPhone: '',
          parentWechat: '',
        });
        fetchPlayers();
      } else {
        alert(data.error || '更新失败');
      }
    } catch (error) {
      console.error('更新学员失败:', error);
      alert('更新学员失败');
    }
  };

  const handleDeletePlayer = async (id: string, name: string) => {
    if (!confirm(`确定要删除学员「${name}」吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/players/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        fetchPlayers();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除学员失败:', error);
      alert('删除学员失败');
    }
  };

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    const fileName = file.name.toLowerCase();
    if (
      !fileName.endsWith('.csv') &&
      !fileName.endsWith('.txt') &&
      !fileName.endsWith('.xlsx') &&
      !fileName.endsWith('.xls')
    ) {
      alert('请上传 CSV 或 Excel 格式的文件');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/players/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setImportResult(data);

      if (!data.success) {
        alert(data.error || '导入失败');
      }
    } catch (error) {
      console.error('导入失败:', error);
      setImportResult({
        success: false,
        total: 0,
        created: 0,
        failed: 0,
        message: '导入过程出错，请重试',
      });
    } finally {
      setImporting(false);
    }
  };

  // 计算统计数据
  const stats = useMemo(() => {
    return {
      total: players.length,
      training: players.filter((p) => p.status === 'training').length,
      trial: players.filter((p) => p.status === 'trial').length,
    };
  }, [players]);

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
                <h1 className="text-xl font-bold text-gray-900">学员管理</h1>
                <p className="text-sm text-gray-500">
                  共 {stats.total} 名学员 · {stats.training} 在训 · {stats.trial} 试听
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingPlayer(null);
                setFormData({
                  name: '',
                  gender: 'male',
                  birthDate: '',
                  group: 'U10',
                  status: 'training',
                  school: '',
                  parentName: '',
                  parentPhone: '',
                  parentWechat: '',
                });
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
            >
              <Plus className="w-4 h-4" />
              添加学员
            </button>
            <a
              href="/api/export?type=players&format=excel"
              download
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg"
            >
              <Download className="w-4 h-4" />
              导出
            </a>
            <button
              onClick={() => {
                setShowImportModal(true);
                setImportResult(null);
              }}
              className="flex items-center gap-2 px-4 py-2 border border-green-300 hover:bg-green-50 text-green-700 rounded-lg"
            >
              <Upload className="w-4 h-4" />
              批量导入
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        {/* 搜索和筛选 - 移动端优化 */}
        <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-4 mb-4 sm:mb-6">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索学员姓名..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base min-h-12"
            />
          </div>

          {/* 筛选条件 - 移动端横向滚动 */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-10 bg-white whitespace-nowrap"
            >
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g === 'all' ? '全部分组' : g}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-10 bg-white whitespace-nowrap"
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 学员列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-gray-500">加载中...</p>
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无学员</h3>
            <p className="text-gray-500 mb-4">点击右上角添加学员开始管理</p>
          </div>
        ) : (
          <div className="space-y-3">
            {players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                onLongPress={(x, y, p) => {
                  setLongPressMenu({
                    show: true,
                    x,
                    y,
                    player: p,
                  });
                }}
                onEdit={handleEditPlayer}
                onDelete={handleDeletePlayer}
              />
            ))}
          </div>
        )}
      </main>

      <PageModals
        longPressMenu={longPressMenu}
        setLongPressMenu={setLongPressMenu}
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        editingPlayer={editingPlayer}
        setEditingPlayer={setEditingPlayer}
        formData={formData}
        setFormData={setFormData}
        handleUpdatePlayer={handleUpdatePlayer}
        handleAddPlayer={handleAddPlayer}
        handleEditPlayer={handleEditPlayer}
        handleDeletePlayer={handleDeletePlayer}
        showImportModal={showImportModal}
        setShowImportModal={setShowImportModal}
        importResult={importResult}
        setImportResult={setImportResult}
        dragActive={dragActive}
        setDragActive={setDragActive}
        handleFileUpload={handleFileUpload}
        fetchPlayers={fetchPlayers}
      />
    </div>
  );
}

interface PlayerCardProps {
  player: Player;
  onLongPress: (clientX: number, clientY: number, player: Player) => void;
  onEdit: (player: Player) => void;
  onDelete: (id: string, name: string) => void;
}

function PlayerCard({ player, onLongPress, onEdit, onDelete }: PlayerCardProps) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    longPressTimer.current = setTimeout(() => {
      onLongPress(touch.clientX, touch.clientY, player);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onLongPress(e.clientX, e.clientY, player);
  };

  return (
    <div
      className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-95 cursor-pointer select-none"
      onClick={() => (window.location.href = `/players/${player.id}`)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      onContextMenu={handleContextMenu}
    >
      {/* 移动端优化：头像 + 姓名 + 分组（一行） */}
      <div className="flex items-center gap-3 mb-3">
        {/* 头像 */}
        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-xl sm:text-lg font-bold text-orange-600">
            {player.name.charAt(0)}
          </span>
        </div>

        {/* 姓名和标签 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate text-base">{player.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[player.status]}`}>
              {statusLabels[player.status]}
            </span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {player.group}
            </span>
          </div>

          {/* 性别和年龄 */}
          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
            <span>{player.gender === 'male' ? '男' : '女'}</span>
            <span>{player.age}岁</span>
            {player.team && <span className="text-orange-600 text-xs">{player.team.name}</span>}
          </div>
        </div>

        {/* 右侧：查看详情按钮 */}
        <Link
          href={`/players/${player.id}`}
          className="p-3 sm:p-2 hover:bg-gray-100 rounded-lg text-orange-600 active:bg-gray-200 transition-colors min-h-12 min-w-12 flex items-center justify-center flex-shrink-0"
          title="查看详情"
          onClick={(e) => e.stopPropagation()}
        >
          <ChevronRight className="w-5 h-5" />
        </Link>
      </div>

      {/* 次要信息：学校、家长电话 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
        {player.school && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{player.school}</span>
          </div>
        )}
        {player.parentPhone?.trim() && (
          <div className="flex items-center gap-1">
            <Phone className="w-3 h-3 flex-shrink-0" />
            <span>{player.parentPhone}</span>
          </div>
        )}
      </div>

      {/* 统计信息和操作按钮 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>训练 {player.trainingCount} 次</span>
          <span>评估 {player.assessmentCount} 次</span>
        </div>

        {/* 移动端：编辑和删除按钮 */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(player);
            }}
            className="p-3 sm:p-2 hover:bg-gray-100 rounded-lg text-gray-400 active:bg-gray-200 transition-colors min-h-12 min-w-12 flex items-center justify-center"
            title="编辑"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(player.id, player.name);
            }}
            className="p-3 sm:p-2 hover:bg-gray-100 rounded-lg text-red-400 active:bg-gray-200 transition-colors min-h-12 min-w-12 flex items-center justify-center"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// 将页面级的弹窗和菜单逻辑提取为内联组件
function PageModals({
  longPressMenu,
  setLongPressMenu,
  showAddModal,
  setShowAddModal,
  editingPlayer,
  setEditingPlayer,
  formData,
  setFormData,
  handleUpdatePlayer,
  handleAddPlayer,
  handleEditPlayer,
  handleDeletePlayer,
  showImportModal,
  setShowImportModal,
  importResult,
  setImportResult,
  dragActive,
  setDragActive,
  handleFileUpload,
  fetchPlayers,
}: {
  longPressMenu: {
    show: boolean;
    x: number;
    y: number;
    player: Player | null;
  };
  setLongPressMenu: React.Dispatch<
    React.SetStateAction<{
      show: boolean;
      x: number;
      y: number;
      player: Player | null;
    }>
  >;
  showAddModal: boolean;
  setShowAddModal: (v: boolean) => void;
  editingPlayer: Player | null;
  setEditingPlayer: (v: Player | null) => void;
  formData: {
    name: string;
    gender: string;
    birthDate: string;
    group: string;
    status: string;
    school: string;
    parentName: string;
    parentPhone: string;
    parentWechat: string;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      name: string;
      gender: string;
      birthDate: string;
      group: string;
      status: string;
      school: string;
      parentName: string;
      parentPhone: string;
      parentWechat: string;
    }>
  >;
  handleUpdatePlayer: () => void;
  handleAddPlayer: () => void;
  handleEditPlayer: (p: Player) => void;
  handleDeletePlayer: (id: string, name: string) => void;
  showImportModal: boolean;
  setShowImportModal: (v: boolean) => void;
  importResult: {
    success: boolean;
    total?: number;
    created?: number;
    failed?: number;
    message?: string;
    errors?: { row: number; message?: string; name?: string; error?: string; type?: string }[];
  } | null;
  setImportResult: (
    v: {
      success: boolean;
      total?: number;
      created?: number;
      failed?: number;
      message?: string;
      errors?: { row: number; message?: string; name?: string; error?: string; type?: string }[];
    } | null
  ) => void;
  dragActive: boolean;
  setDragActive: (v: boolean) => void;
  handleFileUpload: (f: File) => Promise<void>;
  fetchPlayers: () => void;
}) {
  return (
    <>
      {/* 长按快捷菜单 */}
      {longPressMenu.show && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setLongPressMenu({ show: false, x: 0, y: 0, player: null })}
          />
          <div
            className="fixed bg-white rounded-xl shadow-xl p-2 z-50 min-w-[200px]"
            style={{
              left: Math.min(longPressMenu.x, window.innerWidth - 220),
              top: Math.min(longPressMenu.y, window.innerHeight - 200),
            }}
          >
            <button
              onClick={() => {
                if (longPressMenu.player?.parentPhone) {
                  window.location.href = `tel:${longPressMenu.player.parentPhone}`;
                }
                setLongPressMenu({ show: false, x: 0, y: 0, player: null });
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Phone className="w-4 h-4 text-green-600" />
              <span className="text-sm">拨打电话</span>
            </button>
            <button
              onClick={() => {
                if (longPressMenu.player) {
                  handleEditPlayer(longPressMenu.player);
                }
                setLongPressMenu({ show: false, x: 0, y: 0, player: null });
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4 text-blue-600" />
              <span className="text-sm">编辑学员</span>
            </button>
            <button
              onClick={() => {
                if (longPressMenu.player) {
                  handleDeletePlayer(longPressMenu.player.id, longPressMenu.player.name);
                }
                setLongPressMenu({ show: false, x: 0, y: 0, player: null });
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-red-600"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">删除学员</span>
            </button>
          </div>
        </>
      )}

      {/* 添加/编辑学员弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900">
                {editingPlayer ? '编辑学员' : '添加新学员'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingPlayer(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 姓名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入学员姓名"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* 出生日期 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  出生日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* 性别和分组 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="male">男</option>
                    <option value="female">女</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分组</label>
                  <select
                    value={formData.group}
                    onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="U6">U6 (4-6岁)</option>
                    <option value="U8">U8 (6-8岁)</option>
                    <option value="U10">U10 (8-10岁)</option>
                    <option value="U12">U12 (10-12岁)</option>
                    <option value="U14">U14 (12-14岁)</option>
                  </select>
                </div>
              </div>

              {/* 状态和学校 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="trial">试听中</option>
                    <option value="training">在训</option>
                    <option value="vacation">请假</option>
                    <option value="suspended">停课</option>
                    <option value="graduated">结业</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">学校</label>
                  <input
                    type="text"
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    placeholder="所在学校"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* 家长信息 */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">家长联系方式</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">家长姓名</label>
                    <input
                      type="text"
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      placeholder="请输入家长姓名"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">联系电话</label>
                      <input
                        type="tel"
                        value={formData.parentPhone}
                        onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                        placeholder="手机号码"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">微信</label>
                      <input
                        type="text"
                        value={formData.parentWechat}
                        onChange={(e) => setFormData({ ...formData, parentWechat: e.target.value })}
                        placeholder="微信号"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingPlayer(null);
                  }}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={editingPlayer ? handleUpdatePlayer : handleAddPlayer}
                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
                >
                  {editingPlayer ? '保存修改' : '添加学员'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 批量导入弹窗 */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900">批量导入学员</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4">
              {!importResult ? (
                <>
                  {/* 下载模板 */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">学员导入模板</p>
                          <p className="text-sm text-gray-500">
                            支持 CSV、XLSX 格式，必填项：姓名、出生日期
                          </p>
                        </div>
                      </div>
                      <a
                        href="/api/players/import"
                        download="player_import_template.csv"
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                      >
                        下载模板
                      </a>
                    </div>
                  </div>

                  {/* 文件上传 */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setDragActive(false);
                      const file = e.dataTransfer.files[0];
                      if (file) await handleFileUpload(file);
                    }}
                  >
                    <Upload
                      className={`w-12 h-12 mx-auto mb-3 ${dragActive ? 'text-green-500' : 'text-gray-400'}`}
                    />
                    <p className="text-gray-700 mb-2">
                      拖拽 CSV/XLSX 文件到此处，或
                      <label className="text-green-600 hover:text-green-700 cursor-pointer mx-1">
                        点击选择文件
                        <input
                          type="file"
                          accept=".csv,.txt,.xlsx,.xls"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                          }}
                        />
                      </label>
                    </p>
                    <p className="text-sm text-gray-500">支持 .csv, .xlsx, .xls 格式</p>
                  </div>

                  {/* 导入说明 */}
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">导入说明</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• 文件格式：CSV（逗号分隔值）或 Excel（.xlsx/.xls）</li>
                      <li>• 必填字段：姓名、出生日期</li>
                      <li>
                        •
                        可选字段：性别（男/女）、分组（U6/U8/U10/U12/U14）、状态、学校、家长姓名、联系电话、微信
                      </li>
                      <li>• 出生日期格式：YYYY-MM-DD（如 2018-05-01）</li>
                      <li>• 分组和状态会自动转换，如"在训"→"training"</li>
                    </ul>
                  </div>
                </>
              ) : (
                /* 导入结果 */
                <div className="space-y-4">
                  {/* 结果摘要 */}
                  <div
                    className={`p-4 rounded-lg ${importResult.success ? 'bg-green-50' : 'bg-red-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      {importResult.success ? (
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      ) : (
                        <AlertCircle className="w-8 h-8 text-red-600" />
                      )}
                      <div>
                        <p
                          className={`font-medium ${importResult.success ? 'text-green-900' : 'text-red-900'}`}
                        >
                          {importResult.message ||
                            (importResult.success
                              ? `成功导入 ${importResult.created} 名学员`
                              : '导入失败')}
                        </p>
                        <p className="text-sm text-gray-600">
                          总计 {importResult.total} 行，成功 {importResult.created} 行，失败{' '}
                          {importResult.failed} 行
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 失败详情 */}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">失败详情</h4>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {importResult.errors.map((err, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-gray-400">第{err.row}行:</span>
                            <span className="text-red-600">
                              {err.name && `${err.name} - `}
                              {err.message || err.error}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setImportResult(null);
                      }}
                      className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      继续导入
                    </button>
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        setImportResult(null);
                        fetchPlayers();
                      }}
                      className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
                    >
                      完成
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
