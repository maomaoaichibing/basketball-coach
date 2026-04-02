'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  ChevronRight,
  Clock,
  Edit,
  MapPin,
  MapPinned,
  Phone,
  Plus,
  Trash2,
  Users,
  UsersRound,
  X,
} from 'lucide-react';

interface Campus {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  managerName: string | null;
  latitude: number | null;
  longitude: number | null;
  openTime: string | null;
  closeTime: string | null;
  status: string;
  description: string | null;
  _count: {
    players: number;
    teams: number;
    coaches: number;
    courts: number;
  };
}

interface Court {
  id: string;
  name: string;
  campusId: string;
  type: string;
  capacity: number;
  status: string;
  campus?: { id: string; name: string };
}

interface Coach {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  campusId: string | null;
  specialties: string;
  status: string;
  hireDate: string | null;
  campus?: { id: string; name: string };
}

export default function CampusesPage() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'campuses' | 'courts' | 'coaches'>('campuses');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'campus' | 'court' | 'coach'>('campus');
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);

  // 校区表单
  const [campusForm, setCampusForm] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    managerName: '',
    openTime: '',
    closeTime: '',
    description: '',
  });

  // 场地表单
  const [courtForm, setCourtForm] = useState({
    name: '',
    campusId: '',
    type: 'indoor',
    capacity: 20,
    description: '',
  });

  // 教练表单
  const [coachForm, setCoachForm] = useState({
    name: '',
    phone: '',
    email: '',
    campusId: '',
    specialties: '',
    hireDate: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'campuses') {
        const res = await fetch('/api/campuses');
        const data = await res.json();
        setCampuses(data.campuses || []);
      } else if (activeTab === 'courts') {
        const res = await fetch('/api/courts');
        const data = await res.json();
        setCourts(data.courts || []);
      } else if (activeTab === 'coaches') {
        const res = await fetch('/api/coaches');
        const data = await res.json();
        setCoaches(data.coaches || []);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    }
    setLoading(false);
  };

  const openModal = (type: 'campus' | 'court' | 'coach', item?: any) => {
    setModalType(type);
    setEditingItem(item || null);
    if (item) {
      if (type === 'campus') {
        setCampusForm({
          name: String(item.name || ''),
          code: String(item.code || ''),
          address: String(item.address || ''),
          phone: String(item.phone || ''),
          managerName: String(item.managerName || ''),
          openTime: String(item.openTime || ''),
          closeTime: String(item.closeTime || ''),
          description: String(item.description || ''),
        });
      } else if (type === 'court') {
        setCourtForm({
          name: String(item.name || ''),
          campusId: String(item.campusId || ''),
          type: String(item.type || ''),
          capacity: Number(item.capacity || 0),
          description: String(item.description || ''),
        });
      } else if (type === 'coach') {
        setCoachForm({
          name: String(item.name || ''),
          phone: String(item.phone || ''),
          email: String(item.email || ''),
          campusId: String(item.campusId || ''),
          specialties: typeof item.specialties === 'string' ? JSON.parse(item.specialties).join(', ') : '',
          hireDate: String(item.hireDate || ''),
          notes: String(item.notes || ''),
        });
      }
    } else {
      resetForms();
    }
    setShowModal(true);
  };

  const resetForms = () => {
    setCampusForm({
      name: '',
      code: '',
      address: '',
      phone: '',
      managerName: '',
      openTime: '',
      closeTime: '',
      description: '',
    });
    setCourtForm({
      name: '',
      campusId: '',
      type: 'indoor',
      capacity: 20,
      description: '',
    });
    setCoachForm({
      name: '',
      phone: '',
      email: '',
      campusId: '',
      specialties: '',
      hireDate: '',
      notes: '',
    });
  };

  const handleSubmit = async () => {
    try {
      if (modalType === 'campus') {
        const res = editingItem
          ? await fetch(`/api/campuses/${editingItem.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(campusForm),
            })
          : await fetch('/api/campuses', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(campusForm),
            });
        if (res.ok) fetchData();
      } else if (modalType === 'court') {
        const res = await fetch('/api/courts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(courtForm),
        });
        if (res.ok) fetchData();
      } else if (modalType === 'coach') {
        const res = await fetch('/api/coaches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...coachForm,
            specialties: coachForm.specialties
              .split(',')
              .map(s => s.trim())
              .filter(Boolean),
          }),
        });
        if (res.ok) fetchData();
      }
      setShowModal(false);
      resetForms();
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  const handleDelete = async (type: string, id: string) => {
    if (!confirm('确定要删除吗？')) return;
    try {
      if (type === 'campus') {
        await fetch(`/api/campuses/${id}`, { method: 'DELETE' });
      }
      fetchData();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      closed: 'bg-gray-100 text-gray-800',
      maintenance: 'bg-orange-100 text-orange-800',
      disabled: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      active: '营业中',
      paused: '暂停',
      closed: '已关闭',
      maintenance: '维护中',
      disabled: '不可用',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${badges[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
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
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">多校区管理</h1>
                <p className="text-sm text-gray-500">管理校区、场地和教练信息</p>
              </div>
            </div>
            <button
              onClick={() =>
                openModal(
                  activeTab === 'campuses' ? 'campus' : activeTab === 'courts' ? 'court' : 'coach'
                )
              }
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新建
              {activeTab === 'campuses' ? '校区' : activeTab === 'courts' ? '场地' : '教练'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="bg-white rounded-lg shadow mb-4">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('campuses')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'campuses'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Building2 className="w-4 h-4 inline mr-2" />
              校区 ({campuses.length})
            </button>
            <button
              onClick={() => setActiveTab('courts')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'courts'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MapPinned className="w-4 h-4 inline mr-2" />
              场地 ({courts.length})
            </button>
            <button
              onClick={() => setActiveTab('coaches')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'coaches'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              教练 ({coaches.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">加载中...</div>
        ) : (
          <>
            {/* Campus List */}
            {activeTab === 'campuses' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campuses.length === 0 ? (
                  <div className="col-span-full bg-white rounded-lg shadow p-8 text-center text-gray-500">
                    暂无校区，点击右上角添加
                  </div>
                ) : (
                  campuses.map(campus => (
                    <div key={campus.id} className="bg-white rounded-lg shadow p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{campus.name}</h3>
                          <p className="text-sm text-gray-500">编码: {campus.code}</p>
                        </div>
                        {getStatusBadge(campus.status)}
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        {campus.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {campus.address}
                          </div>
                        )}
                        {campus.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {campus.phone}
                          </div>
                        )}
                        {campus.openTime && campus.closeTime && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {campus.openTime} - {campus.closeTime}
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-2 text-center">
                        <div>
                          <div className="text-lg font-bold text-indigo-600">
                            {campus._count.players}
                          </div>
                          <div className="text-xs text-gray-500">学员</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-green-600">
                            {campus._count.teams}
                          </div>
                          <div className="text-xs text-gray-500">球队</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-orange-600">
                            {campus._count.coaches}
                          </div>
                          <div className="text-xs text-gray-500">教练</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-blue-600">
                            {campus._count.courts}
                          </div>
                          <div className="text-xs text-gray-500">场地</div>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          onClick={() => openModal('campus', campus)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete('campus', campus.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Court List */}
            {activeTab === 'courts' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        场地名称
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        所属校区
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        类型
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        容量
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        状态
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {courts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          暂无场地
                        </td>
                      </tr>
                    ) : (
                      courts.map(court => (
                        <tr key={court.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {court.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {court.campus?.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {court.type === 'indoor' ? '室内' : '室外'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">{court.capacity}人</td>
                          <td className="px-4 py-3 text-center">{getStatusBadge(court.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Coach List */}
            {activeTab === 'coaches' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        姓名
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        电话
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        所属校区
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        专长
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        状态
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {coaches.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          暂无教练
                        </td>
                      </tr>
                    ) : (
                      coaches.map(coach => (
                        <tr key={coach.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {coach.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{coach.phone}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {coach.campus?.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {coach.specialties ? JSON.parse(coach.specialties).join(', ') : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">{getStatusBadge(coach.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingItem ? '编辑' : '新建'}
                {modalType === 'campus' ? '校区' : modalType === 'court' ? '场地' : '教练'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Campus Form */}
              {modalType === 'campus' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      校区名称 *
                    </label>
                    <input
                      type="text"
                      value={campusForm.name}
                      onChange={e => setCampusForm({ ...campusForm, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      校区代码 *
                    </label>
                    <input
                      type="text"
                      value={campusForm.code}
                      onChange={e => setCampusForm({ ...campusForm, code: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      disabled={!!editingItem}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
                    <input
                      type="text"
                      value={campusForm.address}
                      onChange={e =>
                        setCampusForm({
                          ...campusForm,
                          address: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
                    <input
                      type="text"
                      value={campusForm.phone}
                      onChange={e => setCampusForm({ ...campusForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">负责人</label>
                    <input
                      type="text"
                      value={campusForm.managerName}
                      onChange={e =>
                        setCampusForm({
                          ...campusForm,
                          managerName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        营业时间
                      </label>
                      <input
                        type="time"
                        value={campusForm.openTime}
                        onChange={e =>
                          setCampusForm({
                            ...campusForm,
                            openTime: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        关门时间
                      </label>
                      <input
                        type="time"
                        value={campusForm.closeTime}
                        onChange={e =>
                          setCampusForm({
                            ...campusForm,
                            closeTime: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Court Form */}
              {modalType === 'court' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      场地名称 *
                    </label>
                    <input
                      type="text"
                      value={courtForm.name}
                      onChange={e => setCourtForm({ ...courtForm, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="如: 1号场"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      所属校区 *
                    </label>
                    <select
                      value={courtForm.campusId}
                      onChange={e => setCourtForm({ ...courtForm, campusId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">请选择校区</option>
                      {campuses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                      <select
                        value={courtForm.type}
                        onChange={e => setCourtForm({ ...courtForm, type: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="indoor">室内</option>
                        <option value="outdoor">室外</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">容量</label>
                      <input
                        type="number"
                        value={courtForm.capacity}
                        onChange={e =>
                          setCourtForm({
                            ...courtForm,
                            capacity: parseInt(e.target.value) || 20,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Coach Form */}
              {modalType === 'coach' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                    <input
                      type="text"
                      value={coachForm.name}
                      onChange={e => setCoachForm({ ...coachForm, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">电话 *</label>
                    <input
                      type="text"
                      value={coachForm.phone}
                      onChange={e => setCoachForm({ ...coachForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">所属校区</label>
                    <select
                      value={coachForm.campusId}
                      onChange={e => setCoachForm({ ...coachForm, campusId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">无</option>
                      {campuses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">专长</label>
                    <input
                      type="text"
                      value={coachForm.specialties}
                      onChange={e =>
                        setCoachForm({
                          ...coachForm,
                          specialties: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="运球,投篮,防守 (逗号分隔)"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
