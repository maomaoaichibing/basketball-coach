import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createAuthSuccess, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()),
}));

const { GET, POST, DELETE } = require('@/app/api/match-events/route');
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

describe('GET /api/match-events', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return auth response when verification fails', async () => {
    verifyAuth.mockResolvedValueOnce(createAuthFailure());

    const response = await GET(createMockRequest());
    expect(response.status).toBe(401);
  });

  it('should list events with filters and match include', async () => {
    mockPrisma.matchEvent.findMany.mockResolvedValue([
      {
        id: 'event-1',
        matchId: 'match-1',
        playerId: 'player-1',
        eventType: 'score',
        match: { id: 'match-1', title: '春季赛', matchDate: '2026-04-01', homeScore: 66, opponentScore: 60, opponent: '飞鹰队', result: 'win' },
      },
    ]);

    const response = await GET(
      createMockRequest(undefined, {
        matchId: 'match-1',
        playerId: 'player-1',
        eventType: 'score',
        limit: '20',
      })
    );
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.events).toHaveLength(1);
    expect(mockPrisma.matchEvent.findMany).toHaveBeenCalledWith({
      where: { matchId: 'match-1', playerId: 'player-1', eventType: 'score' },
      orderBy: [{ matchId: 'desc' }, { quarter: 'asc' }, { eventTime: 'asc' }],
      take: 20,
      include: {
        match: {
          select: {
            id: true,
            title: true,
            matchDate: true,
            homeScore: true,
            opponentScore: true,
            opponent: true,
            result: true,
          },
        },
      },
    });
  });
});

describe('POST /api/match-events', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return 400 when required fields are missing', async () => {
    const response = await POST(createMockRequest({ matchId: 'match-1' }));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.error).toContain('缺少必填字段');
  });

  it('should create a scoring event and update match score', async () => {
    mockPrisma.match.findUnique.mockResolvedValue({
      id: 'match-1',
      isHome: true,
      homeScore: 60,
      opponentScore: 55,
    });
    mockPrisma.match.update.mockResolvedValue({ id: 'match-1', homeScore: 62, opponentScore: 55, result: 'win' });
    mockPrisma.matchEvent.create.mockResolvedValue({ id: 'event-1', eventType: 'score', points: 2 });

    const response = await POST(
      createMockRequest({
        matchId: 'match-1',
        eventType: 'score',
        points: 2,
        eventTime: '05:12',
        quarter: 2,
        playerId: 'player-1',
        playerName: '张三',
      })
    );
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.match.update).toHaveBeenCalledWith({
      where: { id: 'match-1' },
      data: {
        homeScore: 62,
        opponentScore: 55,
        result: 'win',
      },
    });
    expect(mockPrisma.matchEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        matchId: 'match-1',
        eventType: 'score',
        points: 2,
        eventTime: '05:12',
        quarter: 2,
        playerId: 'player-1',
        playerName: '张三',
      }),
    });
  });
});

describe('DELETE /api/match-events', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return 400 when id query is missing', async () => {
    const response = await DELETE(createMockRequest());
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.error).toContain('缺少事件ID');
  });

  it('should delete event by id query parameter', async () => {
    mockPrisma.matchEvent.delete.mockResolvedValue({ id: 'event-1' });

    const response = await DELETE(createMockRequest(undefined, { id: 'event-1' }));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.matchEvent.delete).toHaveBeenCalledWith({ where: { id: 'event-1' } });
  });
});
