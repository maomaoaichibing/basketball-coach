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

const { GET, PUT, DELETE } = require('@/app/api/schedules/[id]/route');

const mockSchedule = (overrides: Record<string, unknown> = {}) => ({
  id: 'schedule-1',
  title: 'U10周六训练',
  group: 'U10',
  teamId: 'team-1',
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
  bookings: [],
  team: { id: 'team-1', name: 'U10 Tigers', coachName: '李教练' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('GET /api/schedules/[id]', () => {
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
    const response = await GET(request, { params: { id: 'schedule-1' } });
    expect(response.status).toBe(401);
  });

  it('should return 404 when schedule not found', async () => {
    mockPrisma.schedule.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('排课不存在');
  });

  it('should return schedule details with team and bookings', async () => {
    mockPrisma.schedule.findUnique.mockResolvedValue(
      mockSchedule({
        bookings: [
          { id: 'b1', player: { id: 'p1', name: '学员A', group: 'U10' }, bookingDate: '2026-04-11', status: 'confirmed' },
          { id: 'b2', player: { id: 'p2', name: '学员B', group: 'U10' }, bookingDate: '2026-04-11', status: 'confirmed' },
        ],
      })
    );

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'schedule-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.schedule.id).toBe('schedule-1');
    expect(result.data.schedule.team).toBeDefined();
    expect(result.data.schedule.applicableCourses).toEqual(['package']);
    expect(mockPrisma.schedule.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'schedule-1' },
        include: expect.objectContaining({
          team: { select: { id: true, name: true, coachName: true } },
          bookings: expect.objectContaining({
            where: { status: 'confirmed' },
            include: { player: { select: { id: true, name: true, group: true } } },
          }),
        }),
      })
    );
  });
});

describe('PUT /api/schedules/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 401, json: async () => ({ success: false, message: '未授权' }) },
    });

    const request = createMockRequest({ title: '更新排课' });
    const response = await PUT(request, { params: { id: 'schedule-1' } });
    expect(response.status).toBe(401);
  });

  it('should return 403 when not admin', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 403, json: async () => ({ success: false, message: '权限不足' }) },
    });

    const request = createMockRequest({ title: '更新排课' });
    const response = await PUT(request, { params: { id: 'schedule-1' } });
    expect(response.status).toBe(403);
  });

  it('should update schedule with single field', async () => {
    mockPrisma.schedule.update.mockResolvedValue(mockSchedule({ title: 'U10 更新后' }));

    const request = createMockRequest({ title: 'U10 更新后' });
    const response = await PUT(request, { params: { id: 'schedule-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.schedule.title).toBe('U10 更新后');
    expect(mockPrisma.schedule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'schedule-1' },
        data: expect.objectContaining({ title: 'U10 更新后' }),
      })
    );
  });

  it('should update schedule applicableCourses with JSON serialization', async () => {
    mockPrisma.schedule.update.mockResolvedValue(mockSchedule({ applicableCourses: '["private","package"]' }));

    const request = createMockRequest({ applicableCourses: ['private', 'package'] });
    const response = await PUT(request, { params: { id: 'schedule-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.schedule.applicableCourses).toEqual(['private', 'package']);
  });
});

describe('DELETE /api/schedules/[id]', () => {
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
    const response = await DELETE(request, { params: { id: 'schedule-1' } });
    expect(response.status).toBe(401);
  });

  it('should return 403 when not admin', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 403, json: async () => ({ success: false, message: '权限不足' }) },
    });

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'schedule-1' } });
    expect(response.status).toBe(403);
  });

  it('should delete schedule and cascade bookings', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce(createAuthSuccess());

    mockPrisma.booking.deleteMany.mockResolvedValue({ count: 3 });
    mockPrisma.schedule.delete.mockResolvedValue(mockSchedule());

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'schedule-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.booking.deleteMany).toHaveBeenCalledWith({ where: { scheduleId: 'schedule-1' } });
    expect(mockPrisma.schedule.delete).toHaveBeenCalledWith({ where: { id: 'schedule-1' } });
  });
});
