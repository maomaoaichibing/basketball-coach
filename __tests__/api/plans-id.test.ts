import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockCoach, createAuthSuccess, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock @/lib/db with both default and named export
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}));

// Mock verifyAuth
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()),
}));

const { GET, PUT, DELETE } = require('@/app/api/plans/[id]/route');

describe('GET /api/plans/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    (verifyAuth as jest.Mock).mockResolvedValueOnce({ success: false, response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) });

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'plan-1' } });

    expect(response.status).toBe(401);
  });

  it('should return 404 when plan not found', async () => {
    mockPrisma.trainingPlan.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('教案不存在');
  });

  it('should return plan with records and playerDetails', async () => {
    const mockPlan = {
      id: 'plan-1',
      title: '运球训练',
      group: 'U10',
      playerIds: '["player-1","player-2"]',
      records: [
        {
          id: 'record-1',
          playerId: 'player-1',
          attendance: 'present',
          player: { id: 'player-1', name: '张三', group: 'U10' },
        },
      ],
    };
    mockPrisma.trainingPlan.findUnique.mockResolvedValue(mockPlan);
    mockPrisma.player.findMany.mockResolvedValue([
      { id: 'player-1', name: '张三', group: 'U10' },
      { id: 'player-2', name: '李四', group: 'U10' },
    ]);

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'plan-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.plan.id).toBe('plan-1');
    expect(result.data.records).toHaveLength(1);
    expect(result.data.playerDetails).toHaveLength(2);
    expect(result.data.playerDetails[0].name).toBe('张三');
  });

  it('should handle empty playerIds', async () => {
    const mockPlan = {
      id: 'plan-1',
      title: '训练',
      playerIds: '[]',
      records: [],
    };
    mockPrisma.trainingPlan.findUnique.mockResolvedValue(mockPlan);

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'plan-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.playerDetails).toHaveLength(0);
  });

  it('should use Promise params when required', async () => {
    mockPrisma.trainingPlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      playerIds: '[]',
      records: [],
    });

    const request = createMockRequest();
    const response = await GET(request, { params: Promise.resolve({ id: 'plan-1' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
  });
});

describe('PUT /api/plans/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    (verifyAuth as jest.Mock).mockResolvedValueOnce({ success: false, response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) });

    const request = createMockRequest({ title: '新标题' });
    const response = await PUT(request, { params: { id: 'plan-1' } });

    expect(response.status).toBe(401);
  });

  it('should update plan', async () => {
    const updatedPlan = { id: 'plan-1', title: '新标题', group: 'U12' };
    mockPrisma.trainingPlan.update.mockResolvedValue(updatedPlan);

    const request = createMockRequest({ title: '新标题', group: 'U12' });
    const response = await PUT(request, { params: { id: 'plan-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.plan.title).toBe('新标题');
    expect(mockPrisma.trainingPlan.update).toHaveBeenCalledWith({
      where: { id: 'plan-1' },
      data: { title: '新标题', group: 'U12' },
    });
  });

  it('should return 500 on update error', async () => {
    mockPrisma.trainingPlan.update.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest({ title: 'test' });
    const response = await PUT(request, { params: { id: 'plan-1' } });

    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/plans/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    (verifyAuth as jest.Mock).mockResolvedValueOnce({ success: false, response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) });

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'plan-1' } });

    expect(response.status).toBe(401);
  });

  it('should delete plan', async () => {
    mockPrisma.trainingPlan.delete.mockResolvedValue({ id: 'plan-1' });

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'plan-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.trainingPlan.delete).toHaveBeenCalledWith({ where: { id: 'plan-1' } });
  });

  it('should return 500 on delete error', async () => {
    mockPrisma.trainingPlan.delete.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'plan-1' } });

    expect(response.status).toBe(500);
  });
});
