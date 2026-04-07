import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import mockPrisma, { resetPrismaMocks, createAuthSuccess } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({ verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()) }));

const { GET } = require('@/app/api/stats/route');

describe('GET /api/stats', () => {
  beforeEach(() => resetPrismaMocks());

  test('returns comprehensive stats with default month period', async () => {
    // Setup all mock return values for the parallel queries
    mockPrisma.player.count
      .mockResolvedValueOnce(50) // total
      .mockResolvedValueOnce(40) // active
      .mockResolvedValueOnce(5)  // trial
      .mockResolvedValueOnce(10); // new this period
    mockPrisma.payment.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 50000 } })  // period income
      .mockResolvedValueOnce({ _sum: { amount: 200000 } }); // month income
    mockPrisma.order.count
      .mockResolvedValueOnce(100) // total
      .mockResolvedValueOnce(10)  // pending
      .mockResolvedValueOnce(80)  // paid
      .mockResolvedValueOnce(15); // this period
    mockPrisma.trainingRecord.count
      .mockResolvedValueOnce(500) // total
      .mockResolvedValueOnce(50); // this period
    mockPrisma.trainingRecord.groupBy.mockResolvedValue([
      { attendance: 'present', _count: 80 },
      { attendance: 'absent', _count: 20 },
    ]);
    mockPrisma.courseEnrollment.aggregate.mockResolvedValue({
      _sum: { remainingHours: 1000, usedHours: 500 },
    });
    mockPrisma.player.groupBy.mockResolvedValue([
      { group: 'U8', _count: 15 },
      { group: 'U10', _count: 20 },
      { group: 'U12', _count: 15 },
    ]);
    mockPrisma.payment.findMany.mockResolvedValue([]);
    mockPrisma.orderItem.groupBy.mockResolvedValue([
      { name: '基础班', _count: 30, _sum: { subtotal: 60000 } },
    ]);

    const req = createMockRequest(); // no period = defaults to 'month'
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.period).toBe('month');
    expect(data.overview).toBeDefined();
    expect(data.overview.totalPlayers).toBe(50);
    expect(data.overview.activePlayers).toBe(40);
    expect(data.overview.totalIncome).toBe(50000);
    expect(data.overview.totalOrders).toBe(100);
    expect(data.overview.attendanceRate).toBeCloseTo(80.0);
    expect(data.overview.totalHoursRemaining).toBe(1000);
    expect(data.overview.totalHoursUsed).toBe(500);
    expect(data.playersByGroup).toHaveLength(3);
    expect(data.incomeTrend).toHaveLength(7); // 7 days
    expect(data.courseSales).toHaveLength(1);
  });

  test('supports day, week, and year period', async () => {
    mockPrisma.player.count.mockResolvedValue(0);
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    mockPrisma.order.count.mockResolvedValue(0);
    mockPrisma.trainingRecord.count.mockResolvedValue(0);
    mockPrisma.trainingRecord.groupBy.mockResolvedValue([]);
    mockPrisma.courseEnrollment.aggregate.mockResolvedValue({ _sum: { remainingHours: 0, usedHours: 0 } });
    mockPrisma.player.groupBy.mockResolvedValue([]);
    mockPrisma.payment.findMany.mockResolvedValue([]);
    mockPrisma.orderItem.groupBy.mockResolvedValue([]);

    for (const period of ['day', 'week', 'year']) {
      resetPrismaMocks();
      mockPrisma.player.count.mockResolvedValue(0);
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.trainingRecord.count.mockResolvedValue(0);
      mockPrisma.trainingRecord.groupBy.mockResolvedValue([]);
      mockPrisma.courseEnrollment.aggregate.mockResolvedValue({ _sum: { remainingHours: 0, usedHours: 0 } });
      mockPrisma.player.groupBy.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.orderItem.groupBy.mockResolvedValue([]);

      const req = createMockRequest(undefined, { period });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.period).toBe(period);
    }
  });

  test('calculates income trend with 7-day window', async () => {
    mockPrisma.player.count.mockResolvedValue(0);
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    mockPrisma.order.count.mockResolvedValue(0);
    mockPrisma.trainingRecord.count.mockResolvedValue(0);
    mockPrisma.trainingRecord.groupBy.mockResolvedValue([]);
    mockPrisma.courseEnrollment.aggregate.mockResolvedValue({ _sum: { remainingHours: 0, usedHours: 0 } });
    mockPrisma.player.groupBy.mockResolvedValue([]);
    mockPrisma.orderItem.groupBy.mockResolvedValue([]);

    // Return payments for today
    const today = new Date();
    mockPrisma.payment.findMany.mockResolvedValue([
      { paidAt: today, amount: 1000 },
      { paidAt: today, amount: 2000 },
    ]);

    const req = createMockRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(data.incomeTrend).toHaveLength(7);
    // Today's entry should have the sum of 3000
    const todayEntry = data.incomeTrend[data.incomeTrend.length - 1];
    expect(todayEntry.amount).toBe(3000);
  });
});
