import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { resetPrismaMocks } from '../helpers/mockPrisma';
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

const { GET, PUT, DELETE } = require('@/app/api/bookings/[id]/route');

const mockBooking = (overrides = {}) => ({
  id: 'b1',
  scheduleId: 's1',
  playerId: 'p1',
  bookingDate: new Date('2024-04-01'),
  status: 'confirmed',
  source: 'online',
  cancelReason: null,
  schedule: { id: 's1', title: 'U10训练', startTime: '10:00', endTime: '11:30', location: '球场A', group: 'U10' },
  player: { id: 'p1', name: '张三', group: 'U10' },
  ...overrides,
});

describe('GET /api/bookings/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 404 when booking not found', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('预约不存在');
  });

  it('should return booking details with schedule and player', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(mockBooking());

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'b1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.booking.id).toBe('b1');
    expect(result.data.booking.schedule.title).toBe('U10训练');
    expect(result.data.booking.player.name).toBe('张三');
  });

  it('should handle database errors', async () => {
    mockPrisma.booking.findUnique.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'b1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
  });
});

describe('PUT /api/bookings/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 404 when booking not found', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(null);

    const request = createMockRequest({ status: 'cancelled' });
    const response = await PUT(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.success).toBe(false);
  });

  it('should update booking status', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(mockBooking({ status: 'confirmed' }));
    mockPrisma.booking.update.mockResolvedValue(mockBooking({ status: 'cancelled' }));

    const request = createMockRequest({ status: 'cancelled' });
    const response = await PUT(request, { params: { id: 'b1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: expect.objectContaining({ status: 'cancelled' }),
    });
  });

  it('should decrement schedule currentCount when cancelling confirmed booking', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(mockBooking({ status: 'confirmed', scheduleId: 's1' }));
    mockPrisma.booking.update.mockResolvedValue(mockBooking({ status: 'cancelled' }));
    mockPrisma.schedule.update.mockResolvedValue({ id: 's1', currentCount: 5 });

    const request = createMockRequest({ status: 'cancelled' });
    await PUT(request, { params: { id: 'b1' } });

    expect(mockPrisma.schedule.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { currentCount: { decrement: 1 } },
    });
  });

  it('should update cancelReason', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(mockBooking({ status: 'confirmed' }));
    mockPrisma.booking.update.mockResolvedValue(mockBooking({ cancelReason: '时间冲突' }));

    const request = createMockRequest({ status: 'cancelled', cancelReason: '时间冲突' });
    const response = await PUT(request, { params: { id: 'b1' } });

    expect(response.status).toBe(200);
    expect(mockPrisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: expect.objectContaining({ status: 'cancelled', cancelReason: '时间冲突' }),
    });
  });

  it('should handle database errors', async () => {
    mockPrisma.booking.findUnique.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest({ status: 'cancelled' });
    const response = await PUT(request, { params: { id: 'b1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
  });
});

describe('DELETE /api/bookings/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should decrement schedule currentCount when deleting confirmed booking', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(mockBooking({ status: 'confirmed', scheduleId: 's1' }));
    mockPrisma.booking.delete.mockResolvedValue(mockBooking());
    mockPrisma.schedule.update.mockResolvedValue({ id: 's1', currentCount: 5 });

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'b1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.schedule.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { currentCount: { decrement: 1 } },
    });
    expect(mockPrisma.booking.delete).toHaveBeenCalledWith({ where: { id: 'b1' } });
  });

  it('should delete booking without decrementing count when not confirmed', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(mockBooking({ status: 'cancelled' }));
    mockPrisma.booking.delete.mockResolvedValue(mockBooking());

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'b1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.schedule.update).not.toHaveBeenCalled();
    expect(mockPrisma.booking.delete).toHaveBeenCalledWith({ where: { id: 'b1' } });
  });

  it('should handle database errors', async () => {
    mockPrisma.booking.findUnique.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'b1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
  });
});
