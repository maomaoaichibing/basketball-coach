import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockPlayer, createMockCoach, createAuthSuccess, resetPrismaMocks } from '../helpers/mockPrisma';
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

const { GET, POST } = require('@/app/api/plans/route');

describe('GET /api/plans', () => {
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

  it('should return plans list', async () => {
    const mockPlans = [
      {
        id: 'plan-1',
        title: '运球训练',
        date: '2024-01-01T00:00:00.000Z',
        group: 'U10',
        theme: '运球',
        focusSkills: '[]',
        sections: '[]',
        playerIds: '[]',
        status: 'published',
        coachId: 'coach-1',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    mockPrisma.trainingPlan.findMany.mockResolvedValue(mockPlans);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.plans).toHaveLength(1);
    expect(result.data.plans[0].title).toBe('运球训练');
  });

  it('should filter plans by group', async () => {
    mockPrisma.trainingPlan.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { group: 'U12' });
    await GET(request);

    expect(mockPrisma.trainingPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { group: 'U12' },
        orderBy: { createdAt: 'desc' },
      })
    );
  });

  it('should return plans with default limit', async () => {
    mockPrisma.trainingPlan.findMany.mockResolvedValue([]);

    const request = createMockRequest();
    await GET(request);

    expect(mockPrisma.trainingPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });
});

describe('POST /api/plans', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    (verifyAuth as jest.Mock).mockResolvedValueOnce({ success: false, response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) });

    const request = createMockRequest({ title: 'test' });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should create plan without playerIds', async () => {
    const mockPlan = {
      id: 'plan-1',
      title: '传球训练',
      date: '2024-01-01T00:00:00.000Z',
      group: 'U10',
      playerIds: '[]',
      status: 'published',
    };
    mockPrisma.trainingPlan.create.mockResolvedValue(mockPlan);

    const request = createMockRequest({
      title: '传球训练',
      date: '2024-01-01',
      duration: 90,
      group: 'U10',
      theme: '传球',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.id).toBe('plan-1');
    expect(mockPrisma.trainingPlan.create).toHaveBeenCalled();
  });

  it('should create plan and auto-create training records when playerIds provided', async () => {
    const mockPlan = {
      id: 'plan-1',
      title: '投篮训练',
      date: '2024-01-01T00:00:00.000Z',
      group: 'U10',
      playerIds: '["player-1","player-2"]',
      status: 'published',
    };
    const mockCoach = createMockCoach();
    mockPrisma.trainingPlan.create.mockResolvedValue(mockPlan);
    mockPrisma.coach.findUnique.mockResolvedValue(mockCoach);
    mockPrisma.player.findMany.mockResolvedValue([
      { id: 'player-1', name: '张三' },
      { id: 'player-2', name: '李四' },
    ]);
    mockPrisma.trainingRecord.createMany.mockResolvedValue({ count: 2 });

    const request = createMockRequest({
      title: '投篮训练',
      date: '2024-01-01',
      duration: 90,
      group: 'U10',
      playerIds: ['player-1', 'player-2'],
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.attendanceCount).toBe(2);
    expect(mockPrisma.trainingRecord.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          planId: 'plan-1',
          playerId: 'player-1',
          attendance: 'present',
        }),
      ]),
    });
  });

  it('should stringify focusSkills, sections, and playerIds', async () => {
    const mockPlan = {
      id: 'plan-1',
      title: '综合训练',
      playerIds: '[]',
      status: 'published',
    };
    mockPrisma.trainingPlan.create.mockResolvedValue(mockPlan);

    const request = createMockRequest({
      title: '综合训练',
      date: '2024-01-01',
      duration: 90,
      group: 'U10',
      focusSkills: ['dribbling', 'passing'],
      sections: [{ name: '热身', duration: 10 }],
      playerIds: ['player-1'],
    });
    await POST(request);

    expect(mockPrisma.trainingPlan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        focusSkills: JSON.stringify(['dribbling', 'passing']),
        sections: JSON.stringify([{ name: '热身', duration: 10 }]),
        playerIds: JSON.stringify(['player-1']),
      }),
    });
  });

  it('should return 500 on database error', async () => {
    mockPrisma.trainingPlan.create.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest({
      title: 'test',
      date: '2024-01-01',
      duration: 90,
      group: 'U10',
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
