import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createAuthSuccess, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()),
}));

const { GET, PUT, DELETE } = require('@/app/api/goals/[id]/route');
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

describe('GET /api/goals/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return auth response when verification fails', async () => {
    verifyAuth.mockResolvedValueOnce(createAuthFailure());

    const response = await GET(createMockRequest(), { params: { id: 'goal-1' } });
    expect(response.status).toBe(401);
  });

  it('should return 404 when goal does not exist', async () => {
    mockPrisma.playerGoal.findUnique.mockResolvedValue(null);

    const response = await GET(createMockRequest(), { params: { id: 'missing-goal' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('目标不存在');
  });

  it('should return goal detail with player info', async () => {
    mockPrisma.playerGoal.findUnique.mockResolvedValue({
      id: 'goal-1',
      skillType: 'passing',
      targetScore: 8,
      currentScore: 5,
      player: { id: 'player-1', name: '李四', group: 'U12' },
    });

    const response = await GET(createMockRequest(), { params: { id: 'goal-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.goal.player.name).toBe('李四');
    expect(mockPrisma.playerGoal.findUnique).toHaveBeenCalledWith({
      where: { id: 'goal-1' },
      include: {
        player: {
          select: { id: true, name: true, group: true },
        },
      },
    });
  });
});

describe('PUT /api/goals/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should update goal scores and set achievedAt for achieved status', async () => {
    mockPrisma.playerGoal.update.mockResolvedValue({
      id: 'goal-1',
      targetScore: 9,
      currentScore: 9,
      status: 'achieved',
    });

    const response = await PUT(
      createMockRequest({
        targetScore: '9',
        currentScore: '9',
        status: 'achieved',
        targetDate: '2026-06-01',
      }),
      { params: { id: 'goal-1' } }
    );
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.playerGoal.update).toHaveBeenCalledWith({
      where: { id: 'goal-1' },
      data: {
        targetScore: 9,
        currentScore: 9,
        status: 'achieved',
        targetDate: expect.any(Date),
        achievedAt: expect.any(Date),
      },
    });
  });
});

describe('DELETE /api/goals/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should delete the goal successfully', async () => {
    mockPrisma.playerGoal.delete.mockResolvedValue({ id: 'goal-1' });

    const response = await DELETE(createMockRequest(), { params: { id: 'goal-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.playerGoal.delete).toHaveBeenCalledWith({ where: { id: 'goal-1' } });
  });
});
