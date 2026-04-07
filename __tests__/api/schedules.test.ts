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

const { GET, POST } = require('@/app/api/schedules/route');

const mockSchedule = (overrides: Record<string, unknown> = {}) => ({
  id: 'schedule-1',
  title: 'U10周六训练',
  group: 'U10',
  teamId: 'team-1',
  team: { id: 'team-1', name: 'U10 Tigers' },
  dayOfWeek: 6,
  startTime: '10:00',
  endTime: '12:00',
  duration: 90,
  location: '1号场地',
  coachId: 'coach-1',
  coachName: '李教练',
  maxPlayers: 20,
  applicableCourses: '["package"]',
  notes: '重点练习传球',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('GET /api/schedules', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 401, json: async () => ({ success: false, message: '未授权' }) },
    });

    const request = createMockRequest();
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should return schedules list', async () => {
    const schedules = [mockSchedule(), mockSchedule({ id: 'schedule-2', title: 'U12周日训练', group: 'U12' })];
    mockPrisma.schedule.findMany.mockResolvedValue(schedules);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.schedules).toHaveLength(2);
    expect(result.data.total).toBe(2);
    expect(mockPrisma.schedule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ team: { select: { id: true, name: true } } }),
      })
    );
  });

  it('should filter by group', async () => {
    mockPrisma.schedule.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { group: 'U12' });
    await GET(request);

    expect(mockPrisma.schedule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { group: 'U12' },
      })
    );
  });

  it('should filter by dayOfWeek', async () => {
    mockPrisma.schedule.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { dayOfWeek: '0' });
    await GET(request);

    expect(mockPrisma.schedule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dayOfWeek: 0 },
      })
    );
  });

  it('should filter by status', async () => {
    mockPrisma.schedule.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { status: 'inactive' });
    await GET(request);

    expect(mockPrisma.schedule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'inactive' },
      })
    );
  });

  it('should ignore all filter values', async () => {
    mockPrisma.schedule.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { group: 'all', dayOfWeek: 'all', status: 'all' });
    await GET(request);

    expect(mockPrisma.schedule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });
});

describe('POST /api/schedules', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 401, json: async () => ({ success: false, message: '未授权' }) },
    });

    const request = createMockRequest({ title: '新排课', dayOfWeek: 6, startTime: '10:00', endTime: '12:00', location: '1号场地' });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should return 403 when not admin', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 403, json: async () => ({ success: false, message: '权限不足' }) },
    });

    const request = createMockRequest({ title: '新排课', dayOfWeek: 6, startTime: '10:00', endTime: '12:00', location: '1号场地' });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('should return 400 when required fields missing', async () => {
    const request = createMockRequest({ title: '缺失字段' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.error).toContain('请填写完整信息');
  });

  it('should create schedule successfully', async () => {
    mockPrisma.schedule.create.mockResolvedValue(mockSchedule({ title: 'U10周六训练', group: 'U10' }));

    const request = createMockRequest({
      title: 'U10周六训练',
      group: 'U10',
      dayOfWeek: 6,
      startTime: '10:00',
      endTime: '12:00',
      location: '1号场地',
      coachName: '李教练',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.schedule.title).toBe('U10周六训练');
    expect(mockPrisma.schedule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'U10周六训练',
          group: 'U10',
          dayOfWeek: 6,
          startTime: '10:00',
          endTime: '12:00',
          location: '1号场地',
        }),
      })
    );
  });
});
