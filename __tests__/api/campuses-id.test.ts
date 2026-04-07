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

const { GET, PUT, DELETE } = require('@/app/api/campuses/[id]/route');

const mockCampus = (overrides: Record<string, unknown> = {}) => ({
  id: 'campus-1',
  name: '总校区',
  code: 'HQ001',
  address: '测试地址',
  phone: '010-12345678',
  managerName: '张校长',
  status: 'active',
  players: [],
  teams: [],
  coaches: [],
  courts: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('GET /api/campuses/[id]', () => {
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
    const response = await GET(request, { params: Promise.resolve({ id: 'campus-1' }) });
    expect(response.status).toBe(401);
  });

  it('should return 404 when campus not found', async () => {
    mockPrisma.campus.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('校区不存在');
  });

  it('should return campus details with players/teams/coaches/courts', async () => {
    mockPrisma.campus.findUnique.mockResolvedValue(
      mockCampus({ players: [{ id: 'p1', name: '学员A' }], teams: [{ id: 't1', name: 'U10队' }] })
    );

    const request = createMockRequest();
    const response = await GET(request, { params: Promise.resolve({ id: 'campus-1' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.campus).toBeDefined();
    expect(result.data.campus.id).toBe('campus-1');
    expect(mockPrisma.campus.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'campus-1' },
        include: expect.objectContaining({
          players: expect.any(Object),
          teams: true,
          coaches: true,
          courts: true,
        }),
      })
    );
  });
});

describe('PUT /api/campuses/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 401, json: async () => ({ success: false, message: '未授权' }) },
    });

    const request = createMockRequest({ name: '更新校区' });
    const response = await PUT(request, { params: Promise.resolve({ id: 'campus-1' }) });
    expect(response.status).toBe(401);
  });

  it('should return 403 when not admin', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 403, json: async () => ({ success: false, message: '权限不足' }) },
    });

    const request = createMockRequest({ name: '更新校区' });
    const response = await PUT(request, { params: Promise.resolve({ id: 'campus-1' }) });
    expect(response.status).toBe(403);
  });

  it('should update campus successfully', async () => {
    const updated = mockCampus({ name: '更新后校区', status: 'inactive' });
    mockPrisma.campus.update.mockResolvedValue(updated);

    const request = createMockRequest({ name: '更新后校区', status: 'inactive' });
    const response = await PUT(request, { params: Promise.resolve({ id: 'campus-1' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.campus.name).toBe('更新后校区');
    expect(mockPrisma.campus.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'campus-1' },
        data: expect.objectContaining({ name: '更新后校区', status: 'inactive' }),
      })
    );
  });
});

describe('DELETE /api/campuses/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 404 when campus not found', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce(createAuthSuccess());

    mockPrisma.campus.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('校区不存在');
  });

  it('should return 400 when campus has players or teams', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce(createAuthSuccess());

    mockPrisma.campus.findUnique.mockResolvedValue(
      mockCampus({ _count: { players: 5, teams: 1, coaches: 0, courts: 0 } })
    );

    const request = createMockRequest();
    const response = await DELETE(request, { params: Promise.resolve({ id: 'campus-1' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.error).toContain('该校区下有学员或球队，无法删除');
  });

  it('should delete campus and cascade courts/coaches', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce(createAuthSuccess());

    mockPrisma.campus.findUnique.mockResolvedValue(
      mockCampus({ _count: { players: 0, teams: 0, coaches: 2, courts: 1 } })
    );
    mockPrisma.court.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.coach.deleteMany.mockResolvedValue({ count: 2 });
    mockPrisma.campus.delete.mockResolvedValue(mockCampus());

    const request = createMockRequest();
    const response = await DELETE(request, { params: Promise.resolve({ id: 'campus-1' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.message).toBe('删除成功');
    expect(mockPrisma.court.deleteMany).toHaveBeenCalledWith({ where: { campusId: 'campus-1' } });
    expect(mockPrisma.coach.deleteMany).toHaveBeenCalledWith({ where: { campusId: 'campus-1' } });
    expect(mockPrisma.campus.delete).toHaveBeenCalledWith({ where: { id: 'campus-1' } });
  });
});
