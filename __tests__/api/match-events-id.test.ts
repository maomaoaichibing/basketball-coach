import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createAuthSuccess, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()),
}));

const { GET, PUT, DELETE } = require('@/app/api/match-events/[id]/route');
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

describe('GET /api/match-events/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return auth response when verification fails', async () => {
    verifyAuth.mockResolvedValueOnce(createAuthFailure());

    const response = await GET(createMockRequest(), { params: { id: 'event-1' } });
    expect(response.status).toBe(401);
  });

  it('should return 404 when event does not exist', async () => {
    mockPrisma.matchEvent.findUnique.mockResolvedValue(null);

    const response = await GET(createMockRequest(), { params: { id: 'missing-event' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('比赛事件不存在');
  });

  it('should return event detail with match info', async () => {
    mockPrisma.matchEvent.findUnique.mockResolvedValue({
      id: 'event-1',
      eventType: 'assist',
      playerName: '李四',
      match: { id: 'match-1', title: '春季赛', teamName: '猛虎队', opponent: '飞鹰队' },
    });

    const response = await GET(createMockRequest(), { params: { id: 'event-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.event.match.teamName).toBe('猛虎队');
    expect(mockPrisma.matchEvent.findUnique).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      include: {
        match: {
          select: { id: true, title: true, teamName: true, opponent: true },
        },
      },
    });
  });
});

describe('PUT /api/match-events/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return 404 when event does not exist before update', async () => {
    mockPrisma.matchEvent.findUnique.mockResolvedValue(null);

    const response = await PUT(createMockRequest({ eventType: 'rebound' }), { params: { id: 'missing-event' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('比赛事件不存在');
  });

  it('should update event fields', async () => {
    mockPrisma.matchEvent.findUnique.mockResolvedValue({ id: 'event-1' });
    mockPrisma.matchEvent.update.mockResolvedValue({ id: 'event-1', eventType: 'rebound' });

    const response = await PUT(
      createMockRequest({
        matchId: 'match-1',
        eventType: 'rebound',
        eventTime: '08:10',
        quarter: 3,
        playerId: 'player-1',
        playerName: '王五',
        points: 0,
        description: '前场篮板',
        relatedPlayerId: 'player-2',
        relatedPlayerName: '赵六',
        courtZone: 'paint',
      }),
      { params: { id: 'event-1' } }
    );
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.matchEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: {
        matchId: 'match-1',
        eventType: 'rebound',
        eventTime: '08:10',
        quarter: 3,
        playerId: 'player-1',
        playerName: '王五',
        points: 0,
        description: '前场篮板',
        relatedPlayerId: 'player-2',
        relatedPlayerName: '赵六',
        courtZone: 'paint',
      },
    });
  });
});

describe('DELETE /api/match-events/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should delete an existing event', async () => {
    mockPrisma.matchEvent.findUnique.mockResolvedValue({ id: 'event-1' });
    mockPrisma.matchEvent.delete.mockResolvedValue({ id: 'event-1' });

    const response = await DELETE(createMockRequest(), { params: { id: 'event-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.matchEvent.delete).toHaveBeenCalledWith({ where: { id: 'event-1' } });
  });
});
