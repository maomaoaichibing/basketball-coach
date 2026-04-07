import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockPlayer, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock verifyAuth
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue({
    success: true,
    user: { id: 'coach-1', email: 'test@test.com', role: 'coach' },
    coach: { id: 'coach-1', name: '测试教练', role: 'coach', status: 'active', phone: '13800000000', campusId: null, email: 'test@test.com' },
  }),
}));

// Mock the database module
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

const { GET, PUT, DELETE } = require('@/app/api/players/[id]/route');

describe('GET /api/players/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 404 when player not found', async () => {
    mockPrisma.player.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    // Simulate dynamic route params
    const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('学员不存在');
  });

  it('should return player details with computed fields', async () => {
    mockPrisma.player.findUnique.mockResolvedValue({
      ...createMockPlayer(),
      team: { id: 'team-1', name: 'U10蓝队' },
      guardians: [],
      records: [],
      assessments: [],
      goals: [],
    });
    mockPrisma.trainingRecord.count.mockResolvedValue(10);
    mockPrisma.trainingRecord.groupBy.mockResolvedValue([
      { attendance: 'present', _count: 8 },
      { attendance: 'absent', _count: 1 },
      { attendance: 'late', _count: 1 },
    ]);

    const request = createMockRequest();
    const response = await GET(request, { params: Promise.resolve({ id: 'player-1' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.player.age).toBeGreaterThan(0);
    expect(result.data.player.totalTrainings).toBe(10);
    expect(result.data.player.attendanceRate).toBe(80);
    expect(result.data.player.presentCount).toBe(8);
    expect(result.data.player.absentCount).toBe(1);
    expect(result.data.player.lateCount).toBe(1);
  });

  it('should calculate average ability score', async () => {
    mockPrisma.player.findUnique.mockResolvedValue({
      ...createMockPlayer(),
      dribbling: 7, passing: 8, shooting: 6, defending: 5, physical: 7, tactical: 6,
      team: null, guardians: [], records: [], assessments: [], goals: [],
    });
    mockPrisma.trainingRecord.count.mockResolvedValue(0);
    mockPrisma.trainingRecord.groupBy.mockResolvedValue([]);

    const request = createMockRequest();
    const response = await GET(request, { params: Promise.resolve({ id: 'player-1' }) });
    const result = await parseJsonResponse(response);

    expect(result.data.player.avgAbility).toBe('6.5'); // (7+8+6+5+7+6)/6 = 39/6 = 6.5
  });
});

describe('PUT /api/players/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 404 when player not found', async () => {
    mockPrisma.player.findUnique.mockResolvedValue(null);

    const request = createMockRequest({ name: '新名字' });
    const response = await PUT(request, { params: Promise.resolve({ id: 'nonexistent' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('学员不存在');
  });

  it('should update player fields', async () => {
    mockPrisma.player.findUnique.mockResolvedValue(createMockPlayer());
    mockPrisma.player.update.mockResolvedValue({
      ...createMockPlayer(),
      name: '新名字',
      group: 'U12',
    });

    const request = createMockRequest({ name: '新名字', group: 'U12' });
    const response = await PUT(request, { params: Promise.resolve({ id: 'player-1' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.player.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'player-1' },
        data: expect.objectContaining({ name: '新名字', group: 'U12' }),
      })
    );
  });

  it('should update skill scores', async () => {
    mockPrisma.player.findUnique.mockResolvedValue(createMockPlayer());
    mockPrisma.player.update.mockResolvedValue(createMockPlayer());

    const request = createMockRequest({
      dribbling: 8,
      passing: 9,
      shooting: 7,
    });
    await PUT(request, { params: Promise.resolve({ id: 'player-1' }) });

    expect(mockPrisma.player.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dribbling: 8,
          passing: 9,
          shooting: 7,
        }),
      })
    );
  });

  it('should disconnect team when teamId is null', async () => {
    mockPrisma.player.findUnique.mockResolvedValue(createMockPlayer());
    mockPrisma.player.update.mockResolvedValue(createMockPlayer());

    const request = createMockRequest({ teamId: null });
    await PUT(request, { params: Promise.resolve({ id: 'player-1' }) });

    expect(mockPrisma.player.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ team: { disconnect: true } }),
      })
    );
  });
});

describe('DELETE /api/players/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 404 when player not found', async () => {
    mockPrisma.player.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
  });

  it('should delete player and all related records', async () => {
    mockPrisma.player.findUnique.mockResolvedValue(createMockPlayer());
    mockPrisma.guardian.deleteMany.mockResolvedValue({ count: 2 });
    mockPrisma.playerGoal.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.playerAssessment.deleteMany.mockResolvedValue({ count: 3 });
    mockPrisma.trainingRecord.deleteMany.mockResolvedValue({ count: 10 });
    mockPrisma.player.delete.mockResolvedValue(createMockPlayer());

    const request = createMockRequest();
    const response = await DELETE(request, { params: Promise.resolve({ id: 'player-1' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.message).toContain('学员删除成功');

    // Verify cascading deletes
    expect(mockPrisma.guardian.deleteMany).toHaveBeenCalledWith({ where: { playerId: 'player-1' } });
    expect(mockPrisma.playerGoal.deleteMany).toHaveBeenCalledWith({ where: { playerId: 'player-1' } });
    expect(mockPrisma.playerAssessment.deleteMany).toHaveBeenCalledWith({ where: { playerId: 'player-1' } });
    expect(mockPrisma.trainingRecord.deleteMany).toHaveBeenCalledWith({ where: { playerId: 'player-1' } });
    expect(mockPrisma.player.delete).toHaveBeenCalledWith({ where: { id: 'player-1' } });
  });

  it('should handle database errors on delete', async () => {
    mockPrisma.player.findUnique.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest();
    const response = await DELETE(request, { params: Promise.resolve({ id: 'player-1' }) });

    expect(response.status).toBe(500);
  });
});
