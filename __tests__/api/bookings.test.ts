import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockPlayer, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue({
    success: true,
    user: { id: 'coach-1', email: 'test@test.com', role: 'coach' },
  }),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}));

const { GET, POST } = require('@/app/api/bookings/route');

describe('GET /api/bookings', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return all bookings with no filters', async () => {
    const mockBookings = [
      {
        id: 'b1',
        scheduleId: 's1',
        playerId: 'p1',
        bookingDate: new Date('2024-04-01'),
        status: 'confirmed',
        source: 'online',
        cancelReason: null,
        schedule: { id: 's1', title: 'U10训练', startTime: '10:00', endTime: '11:30', location: '球场A', group: 'U10' },
        player: { id: 'p1', name: '张三', group: 'U10' },
      },
    ];
    mockPrisma.booking.findMany.mockResolvedValue(mockBookings);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.bookings).toHaveLength(1);
    expect(result.data.total).toBe(1);
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        orderBy: { bookingDate: 'desc' },
      })
    );
  });

  it('should filter by scheduleId', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { scheduleId: 's1' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ scheduleId: 's1' }),
      })
    );
  });

  it('should filter by playerId', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { playerId: 'p1' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ playerId: 'p1' }),
      })
    );
  });

  it('should filter by date', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { date: '2024-04-01' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ bookingDate: new Date('2024-04-01') }),
      })
    );
  });

  it('should filter by status (not "all")', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { status: 'confirmed' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'confirmed' }),
      })
    );
  });

  it('should not filter status when value is "all"', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { status: 'all' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining(['status']) })
    );
  });

  it('should handle database errors', async () => {
    mockPrisma.booking.findMany.mockRejectedValue(new Error('Database error'));

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
  });
});

describe('POST /api/bookings', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 400 when required fields are missing', async () => {
    const request = createMockRequest({ scheduleId: 's1' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('请填写完整信息');
  });

  it('should return 400 when duplicate booking exists', async () => {
    mockPrisma.booking.findFirst.mockResolvedValue({ id: 'existing' });

    const request = createMockRequest({
      scheduleId: 's1',
      playerId: 'p1',
      bookingDate: '2024-04-01',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.error).toContain('该学员已预约此课程');
  });

  it('should return 404 when schedule does not exist', async () => {
    mockPrisma.booking.findFirst.mockResolvedValue(null);
    mockPrisma.schedule.findUnique.mockResolvedValue(null);

    const request = createMockRequest({
      scheduleId: 'nonexistent',
      playerId: 'p1',
      bookingDate: '2024-04-01',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('课程不存在');
  });

  it('should return 400 when schedule is full', async () => {
    mockPrisma.booking.findFirst.mockResolvedValue(null);
    mockPrisma.schedule.findUnique.mockResolvedValue({ id: 's1', maxPlayers: 10 });
    mockPrisma.booking.count.mockResolvedValue(10);

    const request = createMockRequest({
      scheduleId: 's1',
      playerId: 'p1',
      bookingDate: '2024-04-01',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.error).toContain('课程已满员');
  });

  it('should create booking successfully', async () => {
    mockPrisma.booking.findFirst.mockResolvedValue(null);
    mockPrisma.schedule.findUnique.mockResolvedValue({ id: 's1', maxPlayers: 20 });
    mockPrisma.booking.count.mockResolvedValue(5);
    mockPrisma.booking.create.mockResolvedValue({
      id: 'b1',
      scheduleId: 's1',
      playerId: 'p1',
      bookingDate: new Date('2024-04-01'),
      status: 'confirmed',
      source: 'online',
    });
    mockPrisma.schedule.update.mockResolvedValue({ id: 's1', currentCount: 6 });

    const request = createMockRequest({
      scheduleId: 's1',
      playerId: 'p1',
      bookingDate: '2024-04-01',
      source: 'online',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.booking.id).toBe('b1');
    expect(mockPrisma.schedule.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { currentCount: { increment: 1 } },
    });
  });

  it('should default source to online when not provided', async () => {
    mockPrisma.booking.findFirst.mockResolvedValue(null);
    mockPrisma.schedule.findUnique.mockResolvedValue({ id: 's1', maxPlayers: 20 });
    mockPrisma.booking.count.mockResolvedValue(5);
    mockPrisma.booking.create.mockResolvedValue({
      id: 'b1',
      scheduleId: 's1',
      playerId: 'p1',
      bookingDate: new Date('2024-04-01'),
      status: 'confirmed',
      source: 'online',
    });

    const request = createMockRequest({
      scheduleId: 's1',
      playerId: 'p1',
      bookingDate: '2024-04-01',
    });
    await POST(request);

    expect(mockPrisma.booking.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: 'online' }),
    });
  });

  it('should handle database errors on create', async () => {
    mockPrisma.booking.findFirst.mockResolvedValue(null);
    mockPrisma.schedule.findUnique.mockResolvedValue({ id: 's1', maxPlayers: 20 });
    mockPrisma.booking.count.mockResolvedValue(5);
    mockPrisma.booking.create.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest({
      scheduleId: 's1',
      playerId: 'p1',
      bookingDate: '2024-04-01',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('创建失败');
  });
});
