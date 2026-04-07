import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import mockPrisma, { resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Parent route does NOT use verifyAuth - only mock db
jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));

const { GET } = require('@/app/api/parent/route');

describe('GET /api/parent', () => {
  beforeEach(() => {
    resetPrismaMocks();
    // Clear the rate limit map by re-importing
    jest.resetModules();
    // Re-require to get fresh rate limit state
  });

  test('returns 400 when phone parameter is missing', async () => {
    // Need fresh import since rateLimitMap is module-scoped
    jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
    const { GET } = require('@/app/api/parent/route');

    const req = createMockRequest();
    const res = await GET(req);
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(400);
    expect(data.data.success).toBe(false);
    expect(data.data.error).toBe('请提供手机号');
  });

  test('returns empty players with message when no match found', async () => {
    mockPrisma.player.findMany.mockResolvedValue([]);

    const req = createMockRequest(undefined, { phone: '19999999999' });
    const res = await GET(req);
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(200);
    expect(data.data.success).toBe(true);
    expect(data.data.players).toEqual([]);
    expect(data.data.message).toContain('未找到关联的学员');
  });

  test('queries by parentPhone and includes team + guardians', async () => {
    const mockPlayer = {
      id: 'p1',
      name: '小学员',
      parentPhone: '13800138000',
      team: { name: 'U10队', coachName: '张教练' },
      guardians: [{ name: '妈妈', relation: 'mother', mobile: '13800138000' }],
      injuries: '[]',
      tags: '[]',
    };
    mockPrisma.player.findMany.mockResolvedValue([mockPlayer]);

    // Mock the subsequent batch queries
    mockPrisma.trainingRecord.findMany.mockResolvedValue([
      { playerId: 'p1', recordedAt: '2026-03-01', plan: { title: '基础训练', date: '2026-03-01', duration: 90, group: 'U10' }, skillScores: null },
    ]);
    mockPrisma.playerAssessment.groupBy.mockResolvedValue([]);
    mockPrisma.playerGoal.findMany.mockResolvedValue([]);
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([]);

    const req = createMockRequest(undefined, { phone: '13800138000' });
    const res = await GET(req);
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(200);
    expect(data.data.success).toBe(true);
    expect(data.data.players).toHaveLength(1);
    expect(data.data.total).toBe(1);

    // Verify the query uses OR on parentPhone and guardians
    expect(mockPrisma.player.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { parentPhone: '13800138000' },
            { guardians: { some: { mobile: '13800138000' } } },
          ],
        }),
      })
    );
  });

  test('parses JSON fields (injuries, tags, skillScores, recordIds)', async () => {
    const mockPlayer = {
      id: 'p2',
      name: '学员2',
      parentPhone: '13800138000',
      team: null,
      guardians: [],
      injuries: JSON.stringify(['膝盖扭伤']),
      tags: JSON.stringify(['重点培养']),
    };
    mockPrisma.player.findMany.mockResolvedValue([mockPlayer]);

    const mockRecord = {
      playerId: 'p2',
      skillScores: JSON.stringify({ dribbling: 7, shooting: 8 }),
    };
    mockPrisma.trainingRecord.findMany.mockResolvedValue([mockRecord]);

    const mockEnrollment = {
      playerId: 'p2',
      course: { name: '基础班' },
      recordIds: JSON.stringify(['r1', 'r2']),
    };
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([mockEnrollment]);
    mockPrisma.playerAssessment.groupBy.mockResolvedValue([]);
    mockPrisma.playerGoal.findMany.mockResolvedValue([]);

    const req = createMockRequest(undefined, { phone: '13800138000' });
    const res = await GET(req);
    const data = await parseJsonResponse(res);

    const player = data.data.players[0];
    expect(Array.isArray(player.injuries)).toBe(true);
    expect(player.injuries).toEqual(['膝盖扭伤']);
    expect(Array.isArray(player.tags)).toBe(true);
    expect(player.tags).toEqual(['重点培养']);
    expect(player.records[0].skillScores).toEqual({ dribbling: 7, shooting: 8 });
    expect(player.enrollments[0].recordIds).toEqual(['r1', 'r2']);
  });
});
