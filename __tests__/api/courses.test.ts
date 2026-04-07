import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { resetPrismaMocks, createAuthSuccess } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

const mockVerifyAuth = jest.fn().mockResolvedValue(createAuthSuccess());
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}));

const { GET, POST } = require('@/app/api/courses/route');

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

describe('GET /api/courses', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return all courses with default status filter', async () => {
    mockPrisma.course.findMany.mockResolvedValue([
      mockCourse(),
      mockCourse({ id: 'c2', status: 'active' }),
    ]);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.courses).toHaveLength(2);
    expect(result.data.total).toBe(2);
    expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
      })
    );
  });

  it('should return all courses when status is "all"', async () => {
    mockPrisma.course.findMany.mockResolvedValue([
      mockCourse({ status: 'active' }),
      mockCourse({ id: 'c2', status: 'inactive' }),
    ]);

    const request = createMockRequest(undefined, { status: 'all' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    );
  });

  it('should parse groups JSON', async () => {
    mockPrisma.course.findMany.mockResolvedValue([mockCourse()]);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.courses[0].groups).toEqual(['U8', 'U10']);
  });

  it('should filter courses by group', async () => {
    mockPrisma.course.findMany.mockResolvedValue([
      mockCourse({ groups: '["U10"]' }),
    ]);

    const request = createMockRequest(undefined, { group: 'U10' });
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.courses).toHaveLength(1);
    expect(result.data.courses[0].groups).toEqual(['U10']);
  });

  it('should exclude courses with non-matching groups', async () => {
    mockPrisma.course.findMany.mockResolvedValue([
      mockCourse({ id: 'c1', groups: '["U8"]' }),
      mockCourse({ id: 'c2', groups: '["U12"]' }),
    ]);

    const request = createMockRequest(undefined, { group: 'U10' });
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.courses).toHaveLength(0);
  });

  it('should handle database errors', async () => {
    mockPrisma.course.findMany.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
  });
});

describe('POST /api/courses', () => {
  beforeEach(() => {
    resetPrismaMocks();
    mockVerifyAuth.mockResolvedValue(createAuthSuccess({ role: 'admin' }));
  });

  it('should return 400 when name is missing', async () => {
    const request = createMockRequest({ type: 'package' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('请填写课程包名称');
  });

  it('should return 401 when not admin', async () => {
    mockVerifyAuth.mockResolvedValue({
      response: { status: 401, json: async () => ({ success: false, error: 'Unauthorized' }) },
    });

    const request = createMockRequest({ name: '新课程' });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should create course successfully', async () => {
    const newCourse = mockCourse({ id: 'new-c1', name: '新课程', groups: '["U10","U12"]' });
    mockPrisma.course.create.mockResolvedValue(newCourse);

    const body = {
      name: '新课程',
      type: 'package',
      totalHours: 20,
      price: 2000,
      validDays: 365,
      groups: ['U10', 'U12'],
      description: '进阶课程',
    };

    const request = createMockRequest(body);
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.course.name).toBe('新课程');
    expect(result.data.course.groups).toEqual(['U10', 'U12']);
    expect(mockPrisma.course.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: '新课程',
        type: 'package',
        totalHours: 20,
        price: 2000,
        groups: '["U10","U12"]',
      }),
    });
  });

  it('should use default values when optional fields not provided', async () => {
    const newCourse = mockCourse({ id: 'new-c1', name: '新课程' });
    mockPrisma.course.create.mockResolvedValue(newCourse);

    const request = createMockRequest({ name: '新课程' });
    await POST(request);

    expect(mockPrisma.course.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'package',
        totalHours: 0,
        price: 0,
        validDays: 365,
        groups: '[]',
      }),
    });
  });

  it('should handle database errors on create', async () => {
    mockPrisma.course.create.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest({ name: '新课程' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('创建失败');
  });
});
