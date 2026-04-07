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

const { GET, POST } = require('@/app/api/courts/route');

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

describe('GET /api/courts', () => {
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

  it('should return courts list', async () => {
    const courts = [
      mockCourt({ id: 'court-1', name: '1号场地' }),
      mockCourt({ id: 'court-2', name: '2号场地', type: 'outdoor' }),
    ];
    mockPrisma.court.findMany.mockResolvedValue(courts);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.courts).toHaveLength(2);
    expect(mockPrisma.court.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ campus: { select: { id: true, name: true } } }),
      })
    );
  });

  it('should filter by campusId', async () => {
    mockPrisma.court.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { campusId: 'campus-1' });
    await GET(request);

    expect(mockPrisma.court.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campusId: 'campus-1' },
      })
    );
  });

  it('should filter by status', async () => {
    mockPrisma.court.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { status: 'inactive' });
    await GET(request);

    expect(mockPrisma.court.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'inactive' },
      })
    );
  });
});

describe('POST /api/courts', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 401, json: async () => ({ success: false, message: '未授权' }) },
    });

    const request = createMockRequest({ name: '新场地', campusId: 'campus-1' });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should return 403 when not admin', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 403, json: async () => ({ success: false, message: '权限不足' }) },
    });

    const request = createMockRequest({ name: '新场地', campusId: 'campus-1' });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('should create court with defaults', async () => {
    mockPrisma.court.create.mockResolvedValue(mockCourt({ name: '新场地', type: 'indoor' }));

    const request = createMockRequest({ name: '新场地', campusId: 'campus-1' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.court).toBeDefined();
    expect(mockPrisma.court.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: '新场地',
          campusId: 'campus-1',
          type: 'indoor',
          capacity: 20,
          status: 'active',
        }),
      })
    );
  });

  it('should create court with provided type and capacity', async () => {
    mockPrisma.court.create.mockResolvedValue(
      mockCourt({ name: '室外场地', type: 'outdoor', capacity: 30 })
    );

    const request = createMockRequest({
      name: '室外场地',
      campusId: 'campus-1',
      type: 'outdoor',
      capacity: 30,
      description: '户外半场',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.court.type).toBe('outdoor');
    expect(result.data.court.capacity).toBe(30);
  });
});
