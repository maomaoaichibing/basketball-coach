import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createAuthSuccess, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()),
}));

const { GET, PUT, DELETE } = require('@/app/api/matches/[id]/route');
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

describe('GET /api/matches/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return auth response when verification fails', async () => {
    verifyAuth.mockResolvedValueOnce(createAuthFailure());

    const response = await GET(createMockRequest(), { params: Promise.resolve({ id: 'match-1' }) });
    expect(response.status).toBe(401);
  });

  it('should return 404 when match does not exist', async () => {
    mockPrisma.match.findUnique.mockResolvedValue(null);

    const response = await GET(createMockRequest(), { params: Promise.resolve({ id: 'missing-match' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('比赛不存在');
  });

  it('should parse JSON fields and include ordered events', async () => {
    mockPrisma.match.findUnique.mockResolvedValue({
      id: 'match-1',
      title: '春季赛',
      quarterScores: '[{"quarter":1,"home":20,"away":18}]',
      players: '["player-1","player-2"]',
      playerStats: '[{"playerId":"player-1","points":10}]',
      events: [{ id: 'event-1', quarter: 1, eventTime: '02:30' }],
    });

    const response = await GET(createMockRequest(), { params: Promise.resolve({ id: 'match-1' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.match.quarterScores).toEqual([{ quarter: 1, home: 20, away: 18 }]);
    expect(result.data.match.players).toEqual(['player-1', 'player-2']);
    expect(result.data.match.playerStats).toEqual([{ playerId: 'player-1', points: 10 }]);
    expect(mockPrisma.match.findUnique).toHaveBeenCalledWith({
      where: { id: 'match-1' },
      include: {
        events: {
          orderBy: [{ quarter: 'asc' }, { eventTime: 'asc' }],
        },
      },
    });
  });
});

describe('PUT /api/matches/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return 404 when match does not exist before update', async () => {
    mockPrisma.match.findUnique.mockResolvedValue(null);

    const response = await PUT(
      createMockRequest({ title: '新标题' }),
      { params: Promise.resolve({ id: 'missing-match' }) }
    );
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('比赛不存在');
  });

  it('should update match and compute result from scores', async () => {
    mockPrisma.match.findUnique.mockResolvedValue({ id: 'match-1', title: '旧标题' });
    mockPrisma.match.update.mockResolvedValue({ id: 'match-1', result: 'win' });

    const response = await PUT(
      createMockRequest({
        title: '新标题',
        homeScore: 78,
        opponentScore: 70,
        quarterScores: [{ quarter: 1, home: 20, away: 18 }],
        players: ['player-1'],
        playerStats: [{ playerId: 'player-1', assists: 5 }],
      }),
      { params: Promise.resolve({ id: 'match-1' }) }
    );
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.match.update).toHaveBeenCalledWith({
      where: { id: 'match-1' },
      data: expect.objectContaining({
        title: '新标题',
        homeScore: 78,
        opponentScore: 70,
        quarterScores: JSON.stringify([{ quarter: 1, home: 20, away: 18 }]),
        players: JSON.stringify(['player-1']),
        playerStats: JSON.stringify([{ playerId: 'player-1', assists: 5 }]),
        result: 'win',
      }),
    });
  });
});

describe('DELETE /api/matches/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should delete related events before deleting the match', async () => {
    mockPrisma.matchEvent.deleteMany.mockResolvedValue({ count: 2 });
    mockPrisma.match.delete.mockResolvedValue({ id: 'match-1' });

    const response = await DELETE(createMockRequest(), { params: Promise.resolve({ id: 'match-1' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.matchEvent.deleteMany).toHaveBeenCalledWith({ where: { matchId: 'match-1' } });
    expect(mockPrisma.match.delete).toHaveBeenCalledWith({ where: { id: 'match-1' } });
  });
});
