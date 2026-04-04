'use client';

import { useState, useEffect } from 'react';

interface OrderItem {
  id: string;
  orderId: string;
  itemType: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  status: string;
  transactionId?: string;
  paidAt?: string;
  createdAt: string;
}

interface Order {
  id: string;
  orderNo: string;
  type: string;
  player?: { id: string; name: string };
  customerName: string | null;
  customerPhone: string | null;
  totalAmount: number;
  discountAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: string;
  paymentMethod: string | null;
  source: string;
  notes: string | null;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
  items: OrderItem[];
  payments: Payment[];
}

interface Course {
  id: string;
  name: string;
  type: string;
  totalHours: number;
  price: number;
  validDays: number;
}

interface Stats {
  total: number;
  pending: number;
  partiallyPaid: number;
  paid: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}

interface PlayerOption {
  id: string;
  name: string;
  group: string;
  parentPhone?: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState({ status: '', type: '', search: '' });

  // 新建订单表单
  const [newOrder, setNewOrder] = useState({
    type: 'course',
    playerId: '',
    customerName: '',
    customerPhone: '',
    discountAmount: 0,
    notes: '',
    validFrom: '',
    validUntil: '',
    items: [
      {
        itemType: 'course',
        courseId: '',
        name: '',
        quantity: 1,
        unitPrice: 0,
        subtotal: 0,
        hours: 0,
        validDays: 365,
      },
    ],
  });

  // 支付表单
  const [payment, setPayment] = useState({
    amount: 0,
    paymentMethod: 'cash',
    transactionNo: '',
    operatorName: '',
    notes: '',
  });

  useEffect(() => {
    fetchOrders();
    fetchCourses();
    fetchPlayers();
  }, [filter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      if (filter.type) params.set('type', filter.type);
      if (filter.search) params.set('search', filter.search);

      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders);
      setStats(data.stats);
    } catch (error) {
      console.error('获取订单失败:', error);
    }
    setLoading(false);
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses?status=active');
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('获取课程失败:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const res = await fetch('/api/players?status=training');
      const data = await res.json();
      setPlayers(data.players || []);
    } catch (error) {
      console.error('获取学员失败:', error);
    }
  };

  const handleAddItem = () => {
    setNewOrder({
      ...newOrder,
      items: [
        ...newOrder.items,
        {
          itemType: 'course',
          courseId: '',
          name: '',
          quantity: 1,
          unitPrice: 0,
          subtotal: 0,
          hours: 0,
          validDays: 365,
        },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    const items = newOrder.items.filter((_, i) => i !== index);
    setNewOrder({ ...newOrder, items });
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const items = [...newOrder.items];
    items[index] = { ...items[index], [field]: value };

    // 如果选择了课程，自动填充信息
    if (field === 'courseId' && value) {
      const course = courses.find(c => c.id === value);
      if (course) {
        items[index] = {
          ...items[index],
          name: course.name,
          unitPrice: course.price,
          subtotal: course.price * items[index].quantity,
          hours: course.totalHours,
          validDays: course.validDays,
        };
      }
    }

    // 如果修改了数量或单价，重新计算小计
    if (field === 'quantity' || field === 'unitPrice') {
      items[index].subtotal = items[index].unitPrice * items[index].quantity;
    }

    setNewOrder({ ...newOrder, items });
  };

  const calculateTotal = () => {
    const subtotal = newOrder.items.reduce((sum, item) => sum + item.subtotal, 0);
    return subtotal - (newOrder.discountAmount || 0);
  };

  const handleCreateOrder = async () => {
    try {
      // 设置学员信息
      if (newOrder.playerId) {
        const player = players.find(p => p.id === newOrder.playerId);
        if (player) {
          newOrder.customerName = player.name;
          newOrder.customerPhone = player.parentPhone || '';
        }
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newOrder,
          totalAmount: calculateTotal(),
          validFrom: newOrder.validFrom || undefined,
          validUntil: newOrder.validUntil || undefined,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchOrders();
      }
    } catch (error) {
      console.error('创建订单失败:', error);
    }
  };

  const resetForm = () => {
    setNewOrder({
      type: 'course',
      playerId: '',
      customerName: '',
      customerPhone: '',
      discountAmount: 0,
      notes: '',
      validFrom: '',
      validUntil: '',
      items: [
        {
          itemType: 'course',
          courseId: '',
          name: '',
          quantity: 1,
          unitPrice: 0,
          subtotal: 0,
          hours: 0,
          validDays: 365,
        },
      ],
    });
  };

  const handlePayment = async () => {
    if (!selectedOrder) return;

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          ...payment,
        }),
      });

      if (res.ok) {
        setShowPaymentModal(false);
        setSelectedOrder(null);
        setPayment({
          amount: 0,
          paymentMethod: 'cash',
          transactionNo: '',
          operatorName: '',
          notes: '',
        });
        fetchOrders();
      }
    } catch (error) {
      console.error('支付失败:', error);
    }
  };

  const openPaymentModal = (order: Order) => {
    setSelectedOrder(order);
    setPayment({
      amount: order.pendingAmount,
      paymentMethod: 'cash',
      transactionNo: '',
      operatorName: '',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const handleCancelOrder = async (order: Order) => {
    if (!confirm('确定要取消该订单吗？')) return;

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (res.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error('取消订单失败:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      partially_paid: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
      refunded: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      pending: '待支付',
      partially_paid: '部分支付',
      paid: '已支付',
      cancelled: '已取消',
      refunded: '已退款',
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs ${badges[status] || 'bg-gray-100 text-gray-800'}`}
      >
        {labels[status] || status}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      course: '课程购买',
      equipment: '器材',
      uniform: '服装',
      other: '其他',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
              <p className="text-sm text-gray-500 mt-1">管理课程购买订单和缴费记录</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              新建订单
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">总订单数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">待支付</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pending + stats.partiallyPaid}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">已支付</p>
              <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">订单总额</p>
              <p className="text-2xl font-bold text-gray-900">¥{stats.totalAmount.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">已收款</p>
              <p className="text-2xl font-bold text-green-600">¥{stats.paidAmount.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">待收款</p>
              <p className="text-2xl font-bold text-red-600">¥{stats.pendingAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 pb-4">
        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="搜索订单号/客户姓名/电话"
            value={filter.search}
            onChange={e => setFilter({ ...filter, search: e.target.value })}
            className="px-3 py-2 border rounded-lg flex-1 min-w-[200px]"
          />
          <select
            value={filter.status}
            onChange={e => setFilter({ ...filter, status: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">全部状态</option>
            <option value="pending">待支付</option>
            <option value="partially_paid">部分支付</option>
            <option value="paid">已支付</option>
            <option value="cancelled">已取消</option>
          </select>
          <select
            value={filter.type}
            onChange={e => setFilter({ ...filter, type: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">全部类型</option>
            <option value="course">课程购买</option>
            <option value="equipment">器材</option>
            <option value="uniform">服装</option>
            <option value="other">其他</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  订单信息
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  客户
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  类型
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  金额
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  已付
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  待付
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  状态
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    暂无订单
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{order.orderNo}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">
                        {order.customerName || order.player?.name || '-'}
                      </div>
                      <div className="text-xs text-gray-500">{order.customerPhone || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{getTypeLabel(order.type)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      ¥{order.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">
                      ¥{order.paidAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-red-600">
                      ¥{order.pendingAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(order.status)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {(order.status === 'pending' || order.status === 'partially_paid') && (
                          <button
                            onClick={() => openPaymentModal(order)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            收款
                          </button>
                        )}
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleCancelOrder(order)}
                            className="text-gray-600 hover:text-gray-800 text-sm"
                          >
                            取消
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">新建订单</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">学员</label>
                  <select
                    value={newOrder.playerId}
                    onChange={e => setNewOrder({ ...newOrder, playerId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">请选择学员</option>
                    {players.map(player => (
                      <option key={player.id} value={player.id}>
                        {player.name} ({player.parentPhone || '无电话'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">订单类型</label>
                  <select
                    value={newOrder.type}
                    onChange={e => setNewOrder({ ...newOrder, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="course">课程购买</option>
                    <option value="equipment">器材</option>
                    <option value="uniform">服装</option>
                    <option value="other">其他</option>
                  </select>
                </div>
              </div>

              {/* 客户信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">客户姓名</label>
                  <input
                    type="text"
                    value={newOrder.customerName}
                    onChange={e => setNewOrder({ ...newOrder, customerName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="非学员客户请填写"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">客户电话</label>
                  <input
                    type="text"
                    value={newOrder.customerPhone}
                    onChange={e =>
                      setNewOrder({
                        ...newOrder,
                        customerPhone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="非学员客户请填写"
                  />
                </div>
              </div>

              {/* 有效期 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">生效日期</label>
                  <input
                    type="date"
                    value={newOrder.validFrom}
                    onChange={e => setNewOrder({ ...newOrder, validFrom: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">失效日期</label>
                  <input
                    type="date"
                    value={newOrder.validUntil}
                    onChange={e => setNewOrder({ ...newOrder, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* 订单项目 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">订单项目</label>
                  <button
                    onClick={handleAddItem}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + 添加项目
                  </button>
                </div>

                <div className="space-y-2">
                  {newOrder.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <select
                        value={item.courseId}
                        onChange={e => handleItemChange(index, 'courseId', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg"
                      >
                        <option value="">选择课程包</option>
                        {courses
                          .filter(c => c.type === 'package' || c.type === 'monthly')
                          .map(course => (
                            <option key={course.id} value={course.id}>
                              {course.name} - ¥{course.price} ({course.totalHours}课时)
                            </option>
                          ))}
                      </select>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e =>
                          handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)
                        }
                        className="w-20 px-2 py-2 border rounded-lg text-center"
                        min="1"
                      />
                      <span className="w-24 text-right text-sm">¥{item.subtotal.toFixed(2)}</span>
                      {newOrder.items.length > 1 && (
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 优惠 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">优惠金额</label>
                <input
                  type="number"
                  value={newOrder.discountAmount}
                  onChange={e =>
                    setNewOrder({
                      ...newOrder,
                      discountAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* 备注 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={newOrder.notes}
                  onChange={e => setNewOrder({ ...newOrder, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>

              {/* 合计 */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">订单总额</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ¥{calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleCreateOrder}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                创建订单
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-bold">收款</h2>
              <p className="text-sm text-gray-500 mt-1">订单号: {selectedOrder.orderNo}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">订单总额</span>
                  <span className="font-medium">¥{selectedOrder.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">已支付</span>
                  <span className="text-green-600">¥{selectedOrder.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">待支付</span>
                  <span className="text-red-600 font-bold">
                    ¥{selectedOrder.pendingAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">支付金额</label>
                <input
                  type="number"
                  value={payment.amount}
                  onChange={e =>
                    setPayment({
                      ...payment,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-lg"
                  min="0"
                  max={selectedOrder.pendingAmount}
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">支付方式</label>
                <select
                  value={payment.paymentMethod}
                  onChange={e => setPayment({ ...payment, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="cash">现金</option>
                  <option value="wechat">微信</option>
                  <option value="alipay">支付宝</option>
                  <option value="bank">银行转账</option>
                  <option value="other">其他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">交易流水号</label>
                <input
                  type="text"
                  value={payment.transactionNo}
                  onChange={e => setPayment({ ...payment, transactionNo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="微信/支付宝交易号"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">操作人</label>
                <input
                  type="text"
                  value={payment.operatorName}
                  onChange={e => setPayment({ ...payment, operatorName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="收款操作人姓名"
                />
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handlePayment}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                确认收款
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
