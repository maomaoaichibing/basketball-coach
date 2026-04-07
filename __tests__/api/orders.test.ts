import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { resetPrismaMocks, createAuthSuccess } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

const mockVerifyAuth = jest.fn().mockResolvedValue(createAuthSuccess());
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));
jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));

const { GET, POST } = require('@/app/api/orders/route');

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
  createdAt: new Date(),
  updatedAt: new Date(),
  player: { id: 'p1', name: '张三' },
  items: [{ id: 'item1', orderId: 'o1', itemType: 'course', itemId: 'c1', name: '基础课程包', quantity: 1, unitPrice: 1000, subtotal: 1000, courseId: 'c1', hours: 10, validDays: 365, notes: null }],
  payments: [],
  ...overrides,
});

describe('GET /api/orders', () => {
  beforeEach(() => {
    resetPrismaMocks();
    mockVerifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return orders with stats', async () => {
    mockPrisma.order.findMany.mockResolvedValue([mockOrder()]);
    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);
    expect(response.status).toBe(200);
    expect(result.data.orders).toHaveLength(1);
    expect(result.data.stats.total).toBe(1);
    expect(result.data.stats.pending).toBe(1);
  });

  it('should filter by status', async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const request = createMockRequest(undefined, { status: 'paid' });
    await GET(request);
    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'paid' }) }));
  });

  it('should filter by playerId', async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const request = createMockRequest(undefined, { playerId: 'p1' });
    await GET(request);
    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ playerId: 'p1' }) }));
  });

  it('should search by orderNo, customerName, or customerPhone', async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const request = createMockRequest(undefined, { search: '张三' });
    await GET(request);
    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: [{ orderNo: { contains: '张三' } }, { customerName: { contains: '张三' } }, { customerPhone: { contains: '张三' } }] }) }));
  });

  it('should calculate stats correctly', async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      mockOrder({ id: 'o1', status: 'pending', totalAmount: 1000, paidAmount: 0 }),
      mockOrder({ id: 'o2', status: 'partially_paid', totalAmount: 2000, paidAmount: 500 }),
      mockOrder({ id: 'o3', status: 'paid', totalAmount: 1500, paidAmount: 1500 }),
    ]);
    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);
    expect(response.status).toBe(200);
    expect(result.data.stats.total).toBe(3);
    expect(result.data.stats.pending).toBe(1);
    expect(result.data.stats.partiallyPaid).toBe(1);
    expect(result.data.stats.paid).toBe(1);
    expect(result.data.stats.totalAmount).toBe(4500);
    expect(result.data.stats.paidAmount).toBe(2000);
    expect(result.data.stats.pendingAmount).toBe(3000);
  });

  it('should handle database errors', async () => {
    mockPrisma.order.findMany.mockRejectedValue(new Error('DB error'));
    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);
    expect(response.status).toBe(500);
    expect(result.data.error).toContain('获取订单列表失败');
  });
});

describe('POST /api/orders', () => {
  beforeEach(() => {
    resetPrismaMocks();
    mockVerifyAuth.mockResolvedValue(createAuthSuccess({ role: 'admin' }));
  });

  it('should return 401 when not admin', async () => {
    mockVerifyAuth.mockResolvedValue({
      success: false,
      response: { status: 401, json: async () => ({ error: 'Unauthorized' }) },
    });
    const request = createMockRequest({ playerId: 'p1', customerName: '张三', items: [] });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should create order with auto-generated orderNo', async () => {
    mockPrisma.order.create.mockResolvedValue(mockOrder({ id: 'new-o1' }));
    const body = { playerId: 'p1', customerName: '张三', customerPhone: '13800138000', items: [{ itemType: 'course', itemId: 'c1', name: '基础课程包', unitPrice: 1000, subtotal: 1000 }], discountAmount: 100 };
    const request = createMockRequest(body);
    const response = await POST(request);
    const result = await parseJsonResponse(response);
    expect(response.status).toBe(200);
    expect(result.data.order).toBeDefined();
    expect(mockPrisma.order.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ orderNo: expect.stringMatching(/^ORD\d{8}/), totalAmount: 900, discountAmount: 100, paidAmount: 0, pendingAmount: 900, status: 'pending', source: 'offline' }) }));
  });

  it('should calculate totalAmount = sum of subtotals minus discount', async () => {
    mockPrisma.order.create.mockResolvedValue(mockOrder({ totalAmount: 1800, discountAmount: 200 }));
    const body = { playerId: 'p1', customerName: '张三', items: [{ itemType: 'course', name: '课程A', unitPrice: 1000, subtotal: 1000 }, { itemType: 'course', name: '课程B', unitPrice: 1000, subtotal: 1000 }], discountAmount: 200 };
    const request = createMockRequest(body);
    await POST(request);
    expect(mockPrisma.order.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ totalAmount: 1800 }) }));
  });

  it('should create order items with all fields', async () => {
    mockPrisma.order.create.mockResolvedValue(mockOrder());
    const body = { playerId: 'p1', customerName: '张三', items: [{ itemType: 'course', itemId: 'c1', name: '基础课程包', quantity: 2, unitPrice: 500, subtotal: 1000, courseId: 'c1', hours: 10, validDays: 365 }] };
    const request = createMockRequest(body);
    await POST(request);
    expect(mockPrisma.order.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ items: { create: expect.arrayContaining([expect.objectContaining({ itemType: 'course', quantity: 2, courseId: 'c1', hours: 10 })]) } }) }));
  });

  it('should handle database errors on create', async () => {
    mockPrisma.order.create.mockRejectedValue(new Error('DB error'));
    const request = createMockRequest({ playerId: 'p1', customerName: '张三', items: [{ itemType: 'course', name: '课程', unitPrice: 1000, subtotal: 1000 }] });
    const response = await POST(request);
    const result = await parseJsonResponse(response);
    expect(response.status).toBe(500);
    expect(result.data.error).toContain('创建订单失败');
  });
});
