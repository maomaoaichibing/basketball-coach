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

const { GET, POST } = require('@/app/api/enrollments/route');

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
  course: { id: 'c1', name: '基础课程包', type: 'package', totalHours: 10 },
  ...overrides,
});

describe('GET /api/enrollments', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return all enrollments with no filters', async () => {
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([
      mockEnrollment(),
      mockEnrollment({ id: 'e2' }),
    ]);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.enrollments).toHaveLength(2);
    expect(result.data.total).toBe(2);
    expect(mockPrisma.courseEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        orderBy: { purchaseDate: 'desc' },
      })
    );
  });

  it('should filter by playerId', async () => {
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { playerId: 'p1' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockPrisma.courseEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ playerId: 'p1' }),
      })
    );
  });

  it('should filter by status', async () => {
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { status: 'active' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockPrisma.courseEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'active' }),
      })
    );
  });

  it('should not filter status when value is "all"', async () => {
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { status: 'all' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockPrisma.courseEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining(['status']) })
    );
  });

  it('should parse recordIds JSON', async () => {
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([mockEnrollment({ recordIds: '["r1","r2"]' })]);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.enrollments[0].recordIds).toEqual(['r1', 'r2']);
  });

  it('should handle database errors', async () => {
    mockPrisma.courseEnrollment.findMany.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
  });
});

describe('POST /api/enrollments', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 400 when playerId or courseId is missing', async () => {
    const request = createMockRequest({ playerId: 'p1' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('请选择学员和课程包');
  });

  it('should return 404 when course does not exist', async () => {
    mockPrisma.course.findUnique.mockResolvedValue(null);

    const request = createMockRequest({ playerId: 'p1', courseId: 'nonexistent' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('课程包不存在');
  });

  it('should create enrollment with course totalHours', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 'c1',
      totalHours: 10,
      validDays: 365,
    });
    mockPrisma.courseEnrollment.create.mockResolvedValue(mockEnrollment());

    const request = createMockRequest({
      playerId: 'p1',
      courseId: 'c1',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.enrollment.recordIds).toEqual([]);
    expect(mockPrisma.courseEnrollment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        playerId: 'p1',
        courseId: 'c1',
        totalHours: 10,
        usedHours: 0,
        remainingHours: 10,
      }),
    });
  });

  it('should use custom totalHours when provided', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 'c1',
      totalHours: 10,
      validDays: 365,
    });
    mockPrisma.courseEnrollment.create.mockResolvedValue(mockEnrollment({ totalHours: 5, remainingHours: 5 }));

    const request = createMockRequest({
      playerId: 'p1',
      courseId: 'c1',
      totalHours: 5,
    });
    await POST(request);

    expect(mockPrisma.courseEnrollment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ totalHours: 5, remainingHours: 5 }),
    });
  });

  it('should calculate expireDate based on validDays', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 'c1',
      totalHours: 10,
      validDays: 30,
    });
    mockPrisma.courseEnrollment.create.mockImplementation(({ data }: { data: { expireDate: Date } }) =>
      Promise.resolve({ ...mockEnrollment(), expireDate: data.expireDate })
    );

    const request = createMockRequest({
      playerId: 'p1',
      courseId: 'c1',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    const expireDate = new Date(result.data.enrollment.expireDate);
    const now = new Date();
    const diffDays = Math.round((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(31);
  });

  it('should handle database errors on create', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({ id: 'c1', totalHours: 10, validDays: 365 });
    mockPrisma.courseEnrollment.create.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest({ playerId: 'p1', courseId: 'c1' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('创建失败');
  });
});
