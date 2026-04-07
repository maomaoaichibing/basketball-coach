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

const { GET, PUT, DELETE } = require('@/app/api/teams/[id]/route');

const mockTeam = (overrides: Record<string, unknown> = {}) => ({
  id: 'team-1',
  name: 'U10 Tigers',
  group: 'U10',
  coachName: '李教练',
  coachPhone: '13800138000',
  location: '总校区',
  trainingTime: '周六 10:00-12:00',
  players: [],
  _count: { players: 0 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('GET /api/teams/[id]', () => {
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
    const response = await GET(request, { params: { id: 'team-1' } });
    expect(response.status).toBe(401);
  });

  it('should return 404 when team not found', async () => {
    mockPrisma.team.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('球队不存在');
  });

  it('should return team details with players and guardians', async () => {
    mockPrisma.team.findUnique.mockResolvedValue(
      mockTeam({
        players: [
          {
            id: 'p1',
            name: '学员A',
            guardians: [{ id: 'g1', name: '家长A', phone: '13900000001' }],
          },
          {
            id: 'p2',
            name: '学员B',
            guardians: [{ id: 'g2', name: '家长B', phone: '13900000002' }],
          },
        ],
      })
    );

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'team-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.team.id).toBe('team-1');
    expect(mockPrisma.team.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'team-1' },
        include: expect.objectContaining({
          players: expect.objectContaining({
            include: { guardians: true },
            orderBy: { name: 'asc' },
          }),
        }),
      })
    );
  });
});

describe('PUT /api/teams/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 401, json: async () => ({ success: false, message: '未授权' }) },
    });

    const request = createMockRequest({ name: '更新球队' });
    const response = await PUT(request, { params: { id: 'team-1' } });
    expect(response.status).toBe(401);
  });

  it('should update team successfully', async () => {
    mockPrisma.team.update.mockResolvedValue(mockTeam({ name: 'U10 更新后', group: 'U10' }));

    const request = createMockRequest({ name: 'U10 更新后', group: 'U10', location: '新场地' });
    const response = await PUT(request, { params: { id: 'team-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.team.name).toBe('U10 更新后');
    expect(mockPrisma.team.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'team-1' },
        data: expect.objectContaining({ name: 'U10 更新后', group: 'U10', location: '新场地' }),
      })
    );
  });
});

describe('DELETE /api/teams/[id]', () => {
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
    const response = await DELETE(request, { params: { id: 'team-1' } });
    expect(response.status).toBe(401);
  });

  it('should return 404 when team not found', async () => {
    mockPrisma.team.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('球队不存在');
  });

  it('should return 400 when team has players', async () => {
    mockPrisma.team.findUnique.mockResolvedValue(
      mockTeam({ _count: { players: 5 } })
    );

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'team-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.error).toContain('该球队还有球员，无法删除');
  });

  it('should delete team successfully', async () => {
    mockPrisma.team.findUnique.mockResolvedValue(mockTeam({ _count: { players: 0 } }));
    mockPrisma.team.delete.mockResolvedValue(mockTeam());

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'team-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.message).toBe('球队删除成功');
    expect(mockPrisma.team.delete).toHaveBeenCalledWith({ where: { id: 'team-1' } });
  });
});
