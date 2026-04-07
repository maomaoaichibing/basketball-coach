import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { resetPrismaMocks, createAuthSuccess } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

const mockVerifyAuth = jest.fn().mockResolvedValue(createAuthSuccess());
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));
jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));

const { GET, PUT, DELETE } = require('@/app/api/courses/[id]/route');

const mockCourse = (overrides = {}) => ({
  id: 'c1',
  name: '基础课程包',
  type: 'package',
  totalHours: 10,
  price: 1000,
  validDays: 365,
  groups: '["U8","U10"]',
  description: '适合初学者',
  notes: null,
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

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
  recordIds: '["r1","r2"]',
  status: 'active',
  notes: null,
  player: { id: 'p1', name: '张三', group: 'U10' },
  ...overrides,
});

describe('GET /api/courses/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    mockVerifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return 404 when course not found', async () => {
    mockPrisma.course.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('课程包不存在');
  });

  it('should return course with parsed groups and enrollments', async () => {
    mockPrisma.course.findUnique.mockResolvedValue(mockCourse());
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([mockEnrollment()]);

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'c1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.course.groups).toEqual(['U8', 'U10']);
    expect(result.data.enrollments).toHaveLength(1);
    expect(result.data.enrollments[0].recordIds).toEqual(['r1', 'r2']);
    expect(result.data.enrollments[0].player.name).toBe('张三');
  });

  it('should handle database errors', async () => {
    mockPrisma.course.findUnique.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'c1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
  });
});

describe('PUT /api/courses/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    mockVerifyAuth.mockResolvedValue(createAuthSuccess({ role: 'admin' }));
  });

  it('should return 500 when course not found (update fails)', async () => {
    mockPrisma.course.update.mockRejectedValue(new Error('Record not found'));

    const request = createMockRequest({ name: '新名称' });
    const response = await PUT(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
  });

  it('should update course fields', async () => {
    mockPrisma.course.update.mockResolvedValue(mockCourse({ name: '更新名称', price: 1500 }));

    const request = createMockRequest({ name: '更新名称', price: 1500 });
    const response = await PUT(request, { params: { id: 'c1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.course.name).toBe('更新名称');
    expect(result.data.course.groups).toEqual(['U8', 'U10']);
    expect(mockPrisma.course.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: expect.objectContaining({ name: '更新名称', price: 1500 }),
    });
  });

  it('should stringify groups when updating', async () => {
    mockPrisma.course.update.mockResolvedValue(mockCourse({ groups: '["U10"]' }));

    const request = createMockRequest({ groups: ['U10'] });
    const response = await PUT(request, { params: { id: 'c1' } });

    expect(response.status).toBe(200);
    expect(mockPrisma.course.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: expect.objectContaining({ groups: '["U10"]' }),
    });
  });

  it('should handle database errors', async () => {
    mockPrisma.course.update.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest({ name: '新名称' });
    const response = await PUT(request, { params: { id: 'c1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
  });
});

describe('DELETE /api/courses/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    mockVerifyAuth.mockResolvedValue(createAuthSuccess({ role: 'admin' }));
  });

  it('should soft delete course when enrollments exist', async () => {
    mockPrisma.courseEnrollment.count.mockResolvedValue(5);
    mockPrisma.course.update.mockResolvedValue(mockCourse({ status: 'inactive' }));

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'c1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.courseEnrollment.count).toHaveBeenCalledWith({ where: { courseId: 'c1' } });
    expect(mockPrisma.course.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { status: 'inactive' },
    });
    expect(mockPrisma.course.delete).not.toHaveBeenCalled();
  });

  it('should hard delete course when no enrollments', async () => {
    mockPrisma.courseEnrollment.count.mockResolvedValue(0);
    mockPrisma.course.delete.mockResolvedValue(mockCourse());

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'c1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.course.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    expect(mockPrisma.course.update).not.toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    mockPrisma.courseEnrollment.count.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'c1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
  });
});
