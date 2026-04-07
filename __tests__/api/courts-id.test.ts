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

const { GET, PUT, DELETE } = require('@/app/api/courts/[id]/route');

const mockCourt = (overrides: Record<string, unknown> = {}) => ({
  id: 'court-1',
  name: '1号场地',
  campusId: 'campus-1',
  campus: { id: 'campus-1', name: '总校区' },
  type: 'indoor',
  capacity: 20,
  status: 'active',
  description: '标准全场',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('GET /api/courts/[id]', () => {
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
    const response = await GET(request, { params: { id: 'court-1' } });
    expect(response.status).toBe(401);
  });

  it('should return 404 when court not found', async () => {
    mockPrisma.court.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('场地不存在');
  });

  it('should return court details with campus', async () => {
    mockPrisma.court.findUnique.mockResolvedValue(
      mockCourt({ name: '1号场地', campus: { id: 'campus-1', name: '总校区' } })
    );

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'court-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.court.id).toBe('court-1');
    expect(result.data.court.campus).toBeDefined();
    expect(mockPrisma.court.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'court-1' },
        include: expect.objectContaining({ campus: { select: { id: true, name: true } } }),
      })
    );
  });
});

describe('PUT /api/courts/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 401, json: async () => ({ success: false, message: '未授权' }) },
    });

    const request = createMockRequest({ name: '更新场地' });
    const response = await PUT(request, { params: { id: 'court-1' } });
    expect(response.status).toBe(401);
  });

  it('should return 403 when not admin', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 403, json: async () => ({ success: false, message: '权限不足' }) },
    });

    const request = createMockRequest({ name: '更新场地' });
    const response = await PUT(request, { params: { id: 'court-1' } });
    expect(response.status).toBe(403);
  });

  it('should return 404 when court not found', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce(createAuthSuccess());

    mockPrisma.court.findUnique.mockResolvedValue(null);

    const request = createMockRequest({ name: '更新场地' });
    const response = await PUT(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('场地不存在');
  });

  it('should update court successfully', async () => {
    mockPrisma.court.findUnique.mockResolvedValue(mockCourt());
    mockPrisma.court.update.mockResolvedValue(mockCourt({ name: '更新后场地', status: 'inactive' }));

    const request = createMockRequest({ name: '更新后场地', status: 'inactive' });
    const response = await PUT(request, { params: { id: 'court-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.court.name).toBe('更新后场地');
    expect(mockPrisma.court.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'court-1' },
        data: expect.objectContaining({ name: '更新后场地', status: 'inactive' }),
      })
    );
  });
});

describe('DELETE /api/courts/[id]', () => {
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
    const response = await DELETE(request, { params: { id: 'court-1' } });
    expect(response.status).toBe(401);
  });

  it('should return 403 when not admin', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 403, json: async () => ({ success: false, message: '权限不足' }) },
    });

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'court-1' } });
    expect(response.status).toBe(403);
  });

  it('should return 404 when court not found', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce(createAuthSuccess());

    mockPrisma.court.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('场地不存在');
  });

  it('should delete court successfully', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce(createAuthSuccess());

    mockPrisma.court.findUnique.mockResolvedValue(mockCourt());
    mockPrisma.court.delete.mockResolvedValue(mockCourt());

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'court-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.message).toBe('场地已删除');
    expect(mockPrisma.court.delete).toHaveBeenCalledWith({ where: { id: 'court-1' } });
  });
});
