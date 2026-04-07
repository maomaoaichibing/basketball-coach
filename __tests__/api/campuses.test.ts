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

const { GET, POST } = require('@/app/api/campuses/route');

describe('GET /api/campuses', () => {
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

  it('should return campuses list with _count', async () => {
    const campuses = [
      { id: 'campus-1', name: '总校区', status: 'active', _count: { players: 10, teams: 2, coaches: 3, courts: 4 } },
      { id: 'campus-2', name: '分部校区', status: 'active', _count: { players: 5, teams: 1, coaches: 2, courts: 2 } },
    ];
    mockPrisma.campus.findMany.mockResolvedValue(campuses);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.campuses).toHaveLength(2);
    expect(mockPrisma.campus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ _count: expect.any(Object) }),
      })
    );
  });

  it('should filter by status', async () => {
    mockPrisma.campus.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { status: 'inactive' });
    await GET(request);

    expect(mockPrisma.campus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'inactive' },
      })
    );
  });
});

describe('POST /api/campuses', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 401, json: async () => ({ success: false, message: '未授权' }) },
    });

    const request = createMockRequest({ name: '新校区' });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should return 403 when not admin', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 403, json: async () => ({ success: false, message: '权限不足' }) },
    });

    const request = createMockRequest({ name: '新校区' });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('should create campus successfully', async () => {
    const campus = { id: 'campus-new', name: '新校区', code: 'NC01', address: '新地址', status: 'active' };
    mockPrisma.campus.create.mockResolvedValue(campus);

    const request = createMockRequest({ name: '新校区', code: 'NC01', address: '新地址' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.campus).toBeDefined();
    expect(mockPrisma.campus.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: '新校区', status: 'active' }),
      })
    );
  });
});
