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

const { GET, PUT, DELETE } = require('@/app/api/enrollments/[id]/route');

const mockEnrollment = (overrides = {}) => ({
  id: 'e1',
  playerId: 'p1',
  courseId: 'c1',
  purchaseDate: new Date('2024-01-01'),
  startDate: new Date('2024-01-01'),
  expireDate: new Date('2025-01-01'),
  totalHours: 10,
  usedHours: 2,
  remainingHours: 8,
  recordIds: '["r1"]',
  status: 'active',
  notes: null,
  player: { id: 'p1', name: '张三', group: 'U10' },
  course: {
    id: 'c1',
    name: '基础课程包',
    type: 'package',
    totalHours: 10,
    price: 1000,
    validDays: 365,
    groups: '[]',
    description: null,
    notes: null,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  ...overrides,
});

describe('GET /api/enrollments/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 404 when enrollment not found', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('记录不存在');
  });

  it('should return enrollment with player, course, and parsed recordIds', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue(
      mockEnrollment({ recordIds: '["r1","r2"]' })
    );

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'e1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.enrollment.recordIds).toEqual(['r1', 'r2']);
    expect(result.data.enrollment.player.name).toBe('张三');
    expect(result.data.enrollment.course.name).toBe('基础课程包');
  });

  it('should handle database errors', async () => {
    mockPrisma.courseEnrollment.findUnique.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'e1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
  });
});

describe('PUT /api/enrollments/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 404 when enrollment not found', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue(null);

    const request = createMockRequest({ usedHours: 1 });
    const response = await PUT(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.success).toBe(false);
  });

  it('should update usedHours and remainingHours', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue(
      mockEnrollment({ usedHours: 2, remainingHours: 8 })
    );
    mockPrisma.courseEnrollment.update.mockResolvedValue(
      mockEnrollment({ usedHours: 3, remainingHours: 7 })
    );

    const request = createMockRequest({ usedHours: 1 });
    const response = await PUT(request, { params: { id: 'e1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.courseEnrollment.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: expect.objectContaining({ usedHours: 3, remainingHours: 7 }),
    });
  });

  it('should append recordIds when provided', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue(
      mockEnrollment({ recordIds: '["r1"]' })
    );
    mockPrisma.courseEnrollment.update.mockResolvedValue(
      mockEnrollment({ recordIds: '["r1","r2","r3"]' })
    );

    const request = createMockRequest({ recordIds: ['r2', 'r3'] });
    await PUT(request, { params: { id: 'e1' } });

    expect(mockPrisma.courseEnrollment.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: expect.objectContaining({ recordIds: '["r1","r2","r3"]' }),
    });
  });

  it('should update status', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue(mockEnrollment());
    mockPrisma.courseEnrollment.update.mockResolvedValue(
      mockEnrollment({ status: 'expired' })
    );

    const request = createMockRequest({ status: 'expired' });
    const response = await PUT(request, { params: { id: 'e1' } });

    expect(response.status).toBe(200);
    expect(mockPrisma.courseEnrollment.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: expect.objectContaining({ status: 'expired' }),
    });
  });

  it('should handle database errors', async () => {
    mockPrisma.courseEnrollment.findUnique.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest({ usedHours: 1 });
    const response = await PUT(request, { params: { id: 'e1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
  });
});

describe('DELETE /api/enrollments/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should delete enrollment', async () => {
    mockPrisma.courseEnrollment.delete.mockResolvedValue(mockEnrollment());

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'e1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.courseEnrollment.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
  });

  it('should handle database errors', async () => {
    mockPrisma.courseEnrollment.delete.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'e1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
  });
});
