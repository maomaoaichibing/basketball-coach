import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createAuthSuccess, createMockPlayer, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()),
}));

const { GET, POST } = require('@/app/api/goals/route');
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

describe('GET /api/goals', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return auth response when verification fails', async () => {
    verifyAuth.mockResolvedValueOnce(createAuthFailure());

    const response = await GET(createMockRequest());
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(result.data.success).toBe(false);
  });

  it('should list goals with playerId and status filters', async () => {
    mockPrisma.playerGoal.findMany.mockResolvedValue([
      {
        id: 'goal-1',
        playerId: 'player-1',
        skillType: 'shooting',
        targetScore: 8,
        currentScore: 5,
        status: 'active',
        player: { id: 'player-1', name: '张三', group: 'U10' },
      },
    ]);

    const response = await GET(createMockRequest(undefined, { playerId: 'player-1', status: 'active' }));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.goals).toHaveLength(1);
    expect(mockPrisma.playerGoal.findMany).toHaveBeenCalledWith({
      where: { playerId: 'player-1', status: 'active' },
      include: {
        player: {
          select: { id: true, name: true, group: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });
});

describe('POST /api/goals', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return 400 when required fields are missing', async () => {
    const response = await POST(createMockRequest({ playerId: 'player-1' }));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('缺少必填字段');
  });

  it('should return 404 when player does not exist', async () => {
    mockPrisma.player.findUnique.mockResolvedValue(null);

    const response = await POST(
      createMockRequest({
        playerId: 'missing-player',
        skillType: 'dribbling',
        targetScore: 7,
      })
    );
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('学员不存在');
    expect(mockPrisma.playerGoal.create).not.toHaveBeenCalled();
  });

  it('should create a goal with current score and parsed target date', async () => {
    mockPrisma.player.findUnique.mockResolvedValue(createMockPlayer({ id: 'player-1', shooting: 6 }));
    mockPrisma.playerGoal.create.mockResolvedValue({
      id: 'goal-1',
      playerId: 'player-1',
      skillType: 'shooting',
      targetScore: 9,
      currentScore: 6,
      status: 'active',
    });

    const response = await POST(
      createMockRequest({
        playerId: 'player-1',
        skillType: 'shooting',
        targetScore: '9',
        targetDate: '2026-05-01',
      })
    );
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.playerGoal.create).toHaveBeenCalledWith({
      data: {
        playerId: 'player-1',
        skillType: 'shooting',
        targetScore: 9,
        currentScore: 6,
        targetDate: expect.any(Date),
        status: 'active',
      },
    });
  });
});
