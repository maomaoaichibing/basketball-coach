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

const { GET, POST } = require('@/app/api/teams/route');

const mockTeam = (overrides: Record<string, unknown> = {}) => ({
  id: 'team-1',
  name: 'U10 Tigers',
  group: 'U10',
  coachName: '李教练',
  coachPhone: '13800138000',
  location: '总校区',
  trainingTime: '周六 10:00-12:00',
  _count: { players: 12 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('GET /api/teams', () => {
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

  it('should return teams list with _count.players', async () => {
    const teams = [
      mockTeam({ id: 'team-1', name: 'U10 Tigers' }),
      mockTeam({ id: 'team-2', name: 'U12 Warriors', group: 'U12' }),
    ];
    mockPrisma.team.findMany.mockResolvedValue(teams);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.teams).toHaveLength(2);
    expect(result.data.total).toBe(2);
    expect(mockPrisma.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ _count: { select: { players: true } } }),
      })
    );
  });

  it('should filter by group', async () => {
    mockPrisma.team.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { group: 'U12' });
    await GET(request);

    expect(mockPrisma.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { group: 'U12' },
      })
    );
  });

  it('should not filter when group is all', async () => {
    mockPrisma.team.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { group: 'all' });
    await GET(request);

    expect(mockPrisma.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });
});

describe('POST /api/teams', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    verifyAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 401, json: async () => ({ success: false, message: '未授权' }) },
    });

    const request = createMockRequest({ name: '新球队' });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should return 400 when name is missing', async () => {
    const request = createMockRequest({ group: 'U10' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.error).toContain('球队名称是必填项');
  });

  it('should create team with default group U10', async () => {
    mockPrisma.team.create.mockResolvedValue(mockTeam({ name: '新球队', group: 'U10' }));

    const request = createMockRequest({ name: '新球队' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.team.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: '新球队', group: 'U10' }),
      })
    );
  });

  it('should create team with provided fields', async () => {
    mockPrisma.team.create.mockResolvedValue(
      mockTeam({ name: 'U12 Warriors', group: 'U12', coachName: '王教练', location: '分部校区' })
    );

    const request = createMockRequest({
      name: 'U12 Warriors',
      group: 'U12',
      coachName: '王教练',
      coachPhone: '13900000000',
      location: '分部校区',
      trainingTime: '周日 14:00-16:00',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.team.group).toBe('U12');
  });
});
