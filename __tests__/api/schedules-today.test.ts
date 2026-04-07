import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createAuthSuccess, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock verifyAuth
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()),
}));

// Mock the database module
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}));

const { GET } = require('@/app/api/schedules/today/route');

describe('GET /api/schedules/today', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMocks();
  });

  it('应返回今天的排课列表（含签到统计）', async () => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    mockPrisma.schedule.findMany.mockResolvedValue([
      {
        id: 'sched-1',
        title: 'U10 周六训练',
        group: 'U10',
        dayOfWeek,
        startTime: '09:00',
        endTime: '10:30',
        duration: 90,
        location: '体育馆',
        coachName: '张教练',
        status: 'active',
        planId: 'plan-1',
        applicableCourses: '["package"]',
        team: { id: 'team-1', name: 'U10精英队' },
        plan: {
          id: 'plan-1',
          title: '运球训练课',
          date: '2026-04-07',
          group: 'U10',
          theme: '基础运球',
          status: 'published',
          duration: 90,
        },
      },
    ]);

    mockPrisma.trainingRecord.findMany.mockResolvedValue([
      {
        id: 'rec-1',
        playerId: 'player-1',
        attendance: 'present',
        performance: 8,
        feedback: '表现不错',
        signInTime: new Date(),
        player: { id: 'player-1', name: '小明', group: 'U10' },
      },
      {
        id: 'rec-2',
        playerId: 'player-2',
        attendance: 'absent',
        performance: null,
        feedback: null,
        signInTime: null,
        player: { id: 'player-2', name: '小红', group: 'U10' },
      },
      {
        id: 'rec-3',
        playerId: 'player-3',
        attendance: 'late',
        performance: 6,
        feedback: null,
        signInTime: new Date(),
        player: { id: 'player-3', name: '小刚', group: 'U10' },
      },
    ]);

    mockPrisma.booking.count.mockResolvedValue(5);

    const req = createMockRequest(undefined, {});
    const res = await GET(req);
    const { status, data } = await parseJsonResponse(res);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.schedules).toHaveLength(1);
    expect(data.schedules[0].planStats).toBeDefined();
    expect(data.schedules[0].planStats.total).toBe(3);
    expect(data.schedules[0].planStats.present).toBe(1);
    expect(data.schedules[0].planStats.absent).toBe(1);
    expect(data.schedules[0].planStats.late).toBe(1);
    expect(data.schedules[0].planStats.records).toHaveLength(3);
    expect(data.schedules[0].bookingCount).toBe(5);
    expect(data.dayOfWeek).toBe(dayOfWeek);
    expect(data.dayName).toBeDefined();
    expect(data.date).toBeDefined();
  });

  it('今天没有排课应返回空列表', async () => {
    mockPrisma.schedule.findMany.mockResolvedValue([]);

    const req = createMockRequest(undefined, {});
    const res = await GET(req);
    const { status, data } = await parseJsonResponse(res);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.schedules).toHaveLength(0);
    expect(data.total).toBe(0);
  });

  it('排课未关联教案时 planStats 应为 null', async () => {
    const today = new Date();
    mockPrisma.schedule.findMany.mockResolvedValue([
      {
        id: 'sched-2',
        title: 'U8 自由训练',
        group: 'U8',
        dayOfWeek: today.getDay(),
        startTime: '14:00',
        endTime: '15:30',
        duration: 90,
        location: '室外场',
        coachName: '李教练',
        status: 'active',
        planId: null,
        applicableCourses: '["package"]',
        team: null,
        plan: null,
      },
    ]);

    mockPrisma.booking.count.mockResolvedValue(0);

    const req = createMockRequest(undefined, {});
    const res = await GET(req);
    const { status, data } = await parseJsonResponse(res);

    expect(status).toBe(200);
    expect(data.schedules[0].planStats).toBeNull();
  });

  it('签到统计中包含学员详情', async () => {
    const today = new Date();
    mockPrisma.schedule.findMany.mockResolvedValue([
      {
        id: 'sched-3',
        title: 'U12 训练',
        group: 'U12',
        dayOfWeek: today.getDay(),
        startTime: '16:00',
        endTime: '17:30',
        duration: 90,
        location: '2号馆',
        status: 'active',
        planId: 'plan-2',
        applicableCourses: '[]',
        team: null,
        plan: { id: 'plan-2', title: '投篮课', date: '2026-04-07', group: 'U12', theme: null, status: 'published', duration: 90 },
      },
    ]);

    mockPrisma.trainingRecord.findMany.mockResolvedValue([
      {
        id: 'rec-10',
        playerId: 'p1',
        attendance: 'present',
        performance: 9,
        feedback: '非常好',
        signInTime: new Date(),
        player: { id: 'p1', name: '小李', group: 'U12' },
      },
    ]);

    mockPrisma.booking.count.mockResolvedValue(0);

    const req = createMockRequest(undefined, {});
    const res = await GET(req);
    const { status, data } = await parseJsonResponse(res);

    expect(status).toBe(200);
    const record = data.schedules[0].planStats.records[0];
    expect(record.playerName).toBe('小李');
    expect(record.attendance).toBe('present');
    expect(record.performance).toBe(9);
    expect(record.feedback).toBe('非常好');
  });

  it('服务端错误应返回 500', async () => {
    mockPrisma.schedule.findMany.mockRejectedValue(new Error('DB error'));

    const req = createMockRequest(undefined, {});
    const res = await GET(req);
    const { status } = await parseJsonResponse(res);

    expect(status).toBe(500);
  });
});
