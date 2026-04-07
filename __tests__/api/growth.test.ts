import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import mockPrisma, { resetPrismaMocks, createMockPlayer, createAuthSuccess } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({ verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()) }));

const { GET } = require('@/app/api/growth/route');

describe('GET /api/growth', () => {
  beforeEach(() => resetPrismaMocks());

  test('returns growth data for all players with abilities, trend, and stats', async () => {
    const mockPlayer = createMockPlayer({
      id: 'p1',
      name: '小学员',
      group: 'U10',
      assessments: [
        { assessedAt: '2026-03-01', dribbling: 7, passing: 6, shooting: 8, defending: 5, physical: 7, tactical: 6, overall: 65 },
        { assessedAt: '2026-02-01', dribbling: 5, passing: 5, shooting: 6, defending: 4, physical: 5, tactical: 5, overall: 50 },
      ],
      records: [
        { attendance: 'present' },
        { attendance: 'present' },
        { attendance: 'absent' },
      ],
      _count: { records: 3, assessments: 2 },
    });

    mockPrisma.player.findMany.mockResolvedValue([mockPlayer]);

    const req = createMockRequest();
    const res = await GET(req);
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(200);
    expect(data.data.success).toBe(true);
    expect(data.data.players).toHaveLength(1);
    expect(data.data.total).toBe(1);

    const player = data.data.players[0];
    expect(player.name).toBe('小学员');
    expect(player.abilities).toBeDefined();
    expect(player.trend).toBeDefined();
    // Trend = latest - previous: dribbling 7-5=2, shooting 8-6=2
    expect(player.trend.dribbling).toBe(2);
    expect(player.trend.shooting).toBe(2);
    // Attendance: 2 present out of 3 = 67%
    expect(player.attendanceRate).toBe(67);
    expect(player.totalTrainings).toBe(3);
  });

  test('filters by group parameter', async () => {
    mockPrisma.player.findMany.mockResolvedValue([]);

    const req = createMockRequest(undefined, { group: 'U12' });
    await GET(req);

    expect(mockPrisma.player.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { group: 'U12' } })
    );
  });

  test('returns all players when group is "all"', async () => {
    mockPrisma.player.findMany.mockResolvedValue([]);

    const req = createMockRequest(undefined, { group: 'all' });
    await GET(req);

    expect(mockPrisma.player.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  test('handles player with no assessments using player-level skills', async () => {
    const mockPlayer = createMockPlayer({
      id: 'p2',
      dribbling: 5, passing: 5, shooting: 5, defending: 5, physical: 5, tactical: 5,
      assessments: [],
      records: [],
      _count: { records: 0, assessments: 0 },
    });
    mockPrisma.player.findMany.mockResolvedValue([mockPlayer]);

    const req = createMockRequest();
    const res = await GET(req);
    const data = await parseJsonResponse(res);

    const player = data.data.players[0];
    expect(player.abilities.dribbling).toBe(5);
    expect(player.trend).toEqual({ dribbling: 0, passing: 0, shooting: 0, defending: 0, physical: 0, tactical: 0 });
    expect(player.attendanceRate).toBe(0);
  });

  test('includes assessment history for chart data', async () => {
    const mockPlayer = createMockPlayer({
      id: 'p3',
      assessments: [
        { assessedAt: '2026-03-01', dribbling: 7, passing: 6, shooting: 8, defending: 5, physical: 7, tactical: 6, overall: 65 },
        { assessedAt: '2026-02-01', dribbling: 5, passing: 5, shooting: 6, defending: 4, physical: 5, tactical: 5, overall: 50 },
      ],
      records: [],
      _count: { records: 0, assessments: 2 },
    });
    mockPrisma.player.findMany.mockResolvedValue([mockPlayer]);

    const req = createMockRequest();
    const res = await GET(req);
    const data = await parseJsonResponse(res);

    const player = data.data.players[0];
    expect(player.assessmentHistory).toHaveLength(2);
    expect(player.assessmentHistory[0].date).toBe('2026-03-01');
    expect(player.assessmentHistory[0].overall).toBe(65);
  });
});
