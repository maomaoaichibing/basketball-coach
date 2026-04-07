import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockPlayer, createMockCoach, createAuthSuccess, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock @/lib/db - assessments uses default import
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}));

// Mock verifyAuth
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()),
}));

const { GET, POST } = require('@/app/api/assessments/route');

describe('GET /api/assessments', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    (verifyAuth as jest.Mock).mockResolvedValueOnce({ success: false, response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) });

    const request = createMockRequest();
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should return assessments list', async () => {
    const mockAssessments = [
      {
        id: 'assessment-1',
        playerId: 'player-1',
        dribbling: 7,
        passing: 8,
        shooting: 6,
        defending: 5,
        physical: 7,
        tactical: 6,
        overall: 7,
        notes: '表现不错',
      },
    ];
    mockPrisma.playerAssessment.findMany.mockResolvedValue(mockAssessments);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.assessments).toHaveLength(1);
    expect(result.data.total).toBe(1);
    expect(result.data.assessments[0].overall).toBe(7);
  });

  it('should filter by playerId', async () => {
    mockPrisma.playerAssessment.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { playerId: 'player-1' });
    await GET(request);

    expect(mockPrisma.playerAssessment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ playerId: 'player-1' }),
        orderBy: { assessedAt: 'desc' },
      })
    );
  });

  it('should return empty list when no assessments', async () => {
    mockPrisma.playerAssessment.findMany.mockResolvedValue([]);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.assessments).toHaveLength(0);
    expect(result.data.total).toBe(0);
  });
});

describe('POST /api/assessments', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    (verifyAuth as jest.Mock).mockResolvedValueOnce({ success: false, response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) });

    const request = createMockRequest({ playerId: 'player-1' });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should return 400 when playerId is missing', async () => {
    const request = createMockRequest({});
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.error).toContain('学员ID是必填项');
  });

  it('should return 404 when player not found', async () => {
    mockPrisma.player.findUnique.mockResolvedValue(null);

    const request = createMockRequest({ playerId: 'nonexistent' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('学员不存在');
  });

  it('should calculate overall from provided scores', async () => {
    const mockPlayer = createMockPlayer({ dribbling: 5, passing: 5, shooting: 5, defending: 5, physical: 5, tactical: 5 });
    mockPrisma.player.findUnique.mockResolvedValue(mockPlayer);
    mockPrisma.playerAssessment.create.mockResolvedValue({ id: 'assessment-1', playerId: 'player-1', overall: 8 });

    const request = createMockRequest({
      playerId: 'player-1',
      dribbling: 8,
      passing: 8,
      shooting: 8,
      defending: 8,
      physical: 8,
      tactical: 8,
      notes: '表现优秀',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.assessment.overall).toBe(8);
  });

  it('should calculate overall from player defaults if scores not provided', async () => {
    const mockPlayer = createMockPlayer({ dribbling: 6, passing: 7, shooting: 6, defending: 5, physical: 7, tactical: 6 });
    mockPrisma.player.findUnique.mockResolvedValue(mockPlayer);
    // (6+7+6+5+7+6)/6 = 37/6 ≈ 6.17 → Math.round = 6
    mockPrisma.playerAssessment.create.mockResolvedValue({ id: 'assessment-1', playerId: 'player-1', overall: 6 });

    const request = createMockRequest({ playerId: 'player-1' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(mockPrisma.playerAssessment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        playerId: 'player-1',
        dribbling: 6,
        passing: 7,
        overall: 6,
      }),
    });
  });

  it('should use provided overall if explicitly set', async () => {
    const mockPlayer = createMockPlayer();
    mockPrisma.player.findUnique.mockResolvedValue(mockPlayer);
    mockPrisma.playerAssessment.create.mockResolvedValue({ id: 'assessment-1', playerId: 'player-1', overall: 9 });

    const request = createMockRequest({
      playerId: 'player-1',
      dribbling: 5,
      overall: 9,
    });
    await POST(request);

    expect(mockPrisma.playerAssessment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ overall: 9 }),
    });
  });

  it('should return 500 on database error', async () => {
    mockPrisma.player.findUnique.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest({ playerId: 'player-1' });
    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
