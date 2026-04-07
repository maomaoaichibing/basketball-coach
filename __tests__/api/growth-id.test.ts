import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import mockPrisma, { resetPrismaMocks, createMockPlayer, createAuthSuccess } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({ verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()) }));

const { GET } = require('@/app/api/growth/[id]/route');

describe('GET /api/growth/[id]', () => {
  beforeEach(() => resetPrismaMocks());

  test('returns single player growth data with computed stats', async () => {
    const mockPlayer = createMockPlayer({
      id: 'p1',
      name: '小学员',
      assessments: [
        { overall: 70, assessedAt: '2026-03-01' },
        { overall: 60, assessedAt: '2026-02-01' },
        { overall: 50, assessedAt: '2026-01-01' },
      ],
      records: [
        { attendance: 'present' },
        { attendance: 'present' },
        { attendance: 'present' },
        { attendance: 'absent' },
      ],
      enrollments: [],
    });
    mockPrisma.player.findUnique.mockResolvedValue(mockPlayer);

    const req = createMockRequest();
    const res = await GET(req, { params: { id: 'p1' } });
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(200);
    expect(data.data.success).toBe(true);
    expect(data.data.player.id).toBe('p1');

    const { stats } = data.data;
    expect(stats.totalAssessments).toBe(3);
    expect(stats.totalRecords).toBe(4);
    // Average score: (70+60+50)/3 = 60
    expect(stats.averageScore).toBe(60);
    // Attendance: 3 present / 4 total = 75%
    expect(stats.attendanceRate).toBe(75);
    // Latest assessment is the first (sorted desc)
    expect(stats.latestAssessment.overall).toBe(70);
  });

  test('returns 404 when player does not exist', async () => {
    mockPrisma.player.findUnique.mockResolvedValue(null);

    const req = createMockRequest();
    const res = await GET(req, { params: { id: 'nonexistent' } });
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(404);
    expect(data.data.success).toBe(false);
    expect(data.data.error).toBe('学员不存在');
  });

  test('handles player with no assessments and no records', async () => {
    const mockPlayer = createMockPlayer({
      id: 'p2',
      assessments: [],
      records: [],
      enrollments: [],
    });
    mockPrisma.player.findUnique.mockResolvedValue(mockPlayer);

    const req = createMockRequest();
    const res = await GET(req, { params: { id: 'p2' } });
    const data = await parseJsonResponse(res);

    const { stats } = data.data;
    expect(stats.totalAssessments).toBe(0);
    expect(stats.totalRecords).toBe(0);
    expect(stats.averageScore).toBe(0);
    expect(stats.attendanceRate).toBe(0);
    expect(stats.latestAssessment).toBeNull();
  });

  test('includes enrollments with courses', async () => {
    const mockPlayer = createMockPlayer({
      id: 'p3',
      assessments: [],
      records: [],
      enrollments: [{ id: 'e1', course: { id: 'c1', name: '基础班' } }],
    });
    mockPrisma.player.findUnique.mockResolvedValue(mockPlayer);

    const req = createMockRequest();
    const res = await GET(req, { params: { id: 'p3' } });
    const data = await parseJsonResponse(res);

    expect(data.data.player.enrollments).toHaveLength(1);
    expect(data.data.player.enrollments[0].course.name).toBe('基础班');
  });
});
