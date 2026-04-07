import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createAuthSuccess, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()),
}));

const { GET, POST } = require('@/app/api/matches/route');
const { verifyAuth } = require('@/lib/auth-middleware');

function createAuthFailure(status = 401) {
  return {
    success: false,
    response: new Response(JSON.stringify({ success: false, error: '未授权' }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  };
}

describe('GET /api/matches', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return auth response when verification fails', async () => {
    verifyAuth.mockResolvedValueOnce(createAuthFailure());

    const response = await GET(createMockRequest());
    expect(response.status).toBe(401);
  });

  it('should list matches with filters and pagination metadata', async () => {
    mockPrisma.match.findMany.mockResolvedValue([
      {
        id: 'match-1',
        title: '春季联赛',
        group: 'U10',
        result: 'win',
        events: [{ id: 'event-1', eventTime: '05:00' }],
      },
    ]);
    mockPrisma.match.count.mockResolvedValue(7);

    const response = await GET(
      createMockRequest(undefined, {
        group: 'U10',
        result: 'win',
        teamId: 'team-1',
        limit: '2',
        offset: '4',
      })
    );
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.page).toBe(3);
    expect(result.data.pageSize).toBe(2);
    expect(result.data.totalPages).toBe(4);
    expect(mockPrisma.match.findMany).toHaveBeenCalledWith({
      where: { group: 'U10', result: 'win', teamId: 'team-1' },
      orderBy: { matchDate: 'desc' },
      take: 2,
      skip: 4,
      include: {
        events: {
          orderBy: { eventTime: 'asc' },
        },
      },
    });
    expect(mockPrisma.match.count).toHaveBeenCalledWith({
      where: { group: 'U10', result: 'win', teamId: 'team-1' },
    });
  });
});

describe('POST /api/matches', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return 400 when required fields are missing', async () => {
    const response = await POST(createMockRequest({ title: '训练赛' }));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.error).toContain('缺少必填字段');
  });

  it('should create a match and stringify array fields', async () => {
    mockPrisma.match.create.mockResolvedValue({ id: 'match-1', title: '训练赛' });

    const response = await POST(
      createMockRequest({
        title: '训练赛',
        group: 'U12',
        matchDate: '2026-04-08T10:00:00.000Z',
        location: '主场',
        teamId: 'team-1',
        teamName: '猛虎队',
        opponent: '飞鹰队',
        isHome: false,
        players: ['player-1', 'player-2'],
        playerStats: [{ playerId: 'player-1', points: 12 }],
      })
    );
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.match.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: '训练赛',
        matchType: 'league',
        group: 'U12',
        matchDate: expect.any(Date),
        location: '主场',
        teamId: 'team-1',
        teamName: '猛虎队',
        opponent: '飞鹰队',
        isHome: false,
        players: JSON.stringify(['player-1', 'player-2']),
        playerStats: JSON.stringify([{ playerId: 'player-1', points: 12 }]),
        status: 'scheduled',
        homeScore: 0,
        opponentScore: 0,
        quarterScores: '[]',
        result: 'pending',
      }),
    });
  });

  it('should keep string payloads for players and playerStats', async () => {
    mockPrisma.match.create.mockResolvedValue({ id: 'match-2', title: '友谊赛' });

    await POST(
      createMockRequest({
        title: '友谊赛',
        group: 'U10',
        matchDate: '2026-04-09T10:00:00.000Z',
        players: '["player-1"]',
        playerStats: '[{"playerId":"player-1","points":8}]',
      })
    );

    expect(mockPrisma.match.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        players: '["player-1"]',
        playerStats: '[{"playerId":"player-1","points":8}]',
      }),
    });
  });
});
