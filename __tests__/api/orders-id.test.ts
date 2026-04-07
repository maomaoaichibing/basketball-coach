import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { resetPrismaMocks, createAuthSuccess } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

const mockVerifyAuth = jest.fn().mockResolvedValue(createAuthSuccess());
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));
jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));

const { GET, PUT, DELETE } = require('@/app/api/orders/[id]/route');

const mockOrder = (overrides = {}) => ({
  id: 'o1',
  orderNo: 'ORD20240401ABC',
  type: 'course',
  playerId: 'p1',
  customerName: '张三',
  customerPhone: '13800138000',
  totalAmount: 1000,
  discountAmount: 0,
  paidAmount: 0,
  pendingAmount: 1000,
  status: 'pending',
  paymentMethod: null,
  source: 'offline',
  notes: null,
  validFrom: null,
  validUntil: null,
  cancelledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  player: { id: 'p1', name: '张三', parentPhone: '13800138000' },
  items: [{ id: 'item1', orderId: 'o1', itemType: 'course', name: '基础课程包', quantity: 1, unitPrice: 1000, subtotal: 1000, courseId: 'c1', hours: 10, validDays: 365, notes: null }],
  payments: [{ id: 'pay1', orderId: 'o1', amount: 500, method: 'wechat', createdAt: new Date() }],
  ...overrides,
});

describe('GET /api/orders/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    mockVerifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return 404 when order not found', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    const request = createMockRequest();
    const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(response.status).toBe(404);
    expect((await parseJsonResponse(response)).data.error).toContain('订单不存在');
  });

  it('should return order with player, items, and payments', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder());
    const request = createMockRequest();
    const response = await GET(request, { params: Promise.resolve({ id: 'o1' }) });
    const result = await parseJsonResponse(response);
    expect(response.status).toBe(200);
    expect(result.data.order.customerName).toBe('张三');
    expect(result.data.order.items).toHaveLength(1);
    expect(result.data.order.payments).toHaveLength(1);
    expect(result.data.order.player.parentPhone).toBe('13800138000');
  });

  it('should handle database errors', async () => {
    mockPrisma.order.findUnique.mockRejectedValue(new Error('DB error'));
    const request = createMockRequest();
    const response = await GET(request, { params: Promise.resolve({ id: 'o1' }) });
    expect(response.status).toBe(500);
  });
});

describe('PUT /api/orders/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    mockVerifyAuth.mockResolvedValue(createAuthSuccess({ role: 'admin' }));
  });

  it('should return 404 when order not found', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    const request = createMockRequest({ customerName: '新名称' });
    const response = await PUT(request, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(response.status).toBe(404);
  });

  it('should update order fields', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder());
    mockPrisma.order.update.mockResolvedValue(mockOrder({ customerName: '李四' }));
    const request = createMockRequest({ customerName: '李四' });
    const response = await PUT(request, { params: Promise.resolve({ id: 'o1' }) });
    const result = await parseJsonResponse(response);
    expect(response.status).toBe(200);
    expect(result.data.order.customerName).toBe('李四');
    expect(mockPrisma.order.update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: expect.objectContaining({ customerName: '李四' }), include: expect.any(Object) });
  });

  it('should recalculate pendingAmount when discountAmount changes', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder({ totalAmount: 1000, paidAmount: 300 }));
    mockPrisma.order.update.mockResolvedValue(mockOrder({ discountAmount: 100, pendingAmount: 600 }));
    const request = createMockRequest({ discountAmount: 100 });
    const response = await PUT(request, { params: Promise.resolve({ id: 'o1' }) });
    expect(response.status).toBe(200);
    expect(mockPrisma.order.update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: expect.objectContaining({ discountAmount: 100, pendingAmount: 600 }), include: expect.any(Object) });
  });

  it('should set cancelledAt when status is cancelled', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder());
    mockPrisma.order.update.mockResolvedValue(mockOrder({ status: 'cancelled' }));
    const request = createMockRequest({ status: 'cancelled' });
    const response = await PUT(request, { params: Promise.resolve({ id: 'o1' }) });
    expect(response.status).toBe(200);
    expect(mockPrisma.order.update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: expect.objectContaining({ status: 'cancelled', cancelledAt: expect.any(Date) }), include: expect.any(Object) });
  });

  it('should handle database errors', async () => {
    mockPrisma.order.findUnique.mockRejectedValue(new Error('DB error'));
    const request = createMockRequest({ customerName: '新名称' });
    const response = await PUT(request, { params: Promise.resolve({ id: 'o1' }) });
    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/orders/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    mockVerifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return 404 when order not found', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    const request = createMockRequest();
    const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(response.status).toBe(404);
  });

  it('should return 400 when order is not pending', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder({ status: 'paid' }));
    const request = createMockRequest();
    const response = await DELETE(request, { params: Promise.resolve({ id: 'o1' }) });
    const result = await parseJsonResponse(response);
    expect(response.status).toBe(400);
    expect(result.data.error).toContain('仅可删除待支付订单');
  });

  it('should delete pending order', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder({ status: 'pending' }));
    mockPrisma.order.delete.mockResolvedValue(mockOrder());
    const request = createMockRequest();
    const response = await DELETE(request, { params: Promise.resolve({ id: 'o1' }) });
    const result = await parseJsonResponse(response);
    expect(response.status).toBe(200);
    expect(result.data.message).toBe('删除成功');
    expect(mockPrisma.order.delete).toHaveBeenCalledWith({ where: { id: 'o1' } });
  });

  it('should handle database errors', async () => {
    mockPrisma.order.findUnique.mockRejectedValue(new Error('DB error'));
    const request = createMockRequest();
    const response = await DELETE(request, { params: Promise.resolve({ id: 'o1' }) });
    expect(response.status).toBe(500);
  });
});
