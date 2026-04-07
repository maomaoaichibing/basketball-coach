import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createAuthSuccess, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()),
}));

const { GET, POST } = require('@/app/api/leaves/route');
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

describe('GET /api/leaves', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return auth response when verification fails', async () => {
    verifyAuth.mockResolvedValueOnce(createAuthFailure());

    const response = await GET(createMockRequest());
    expect(response.status).toBe(401);
  });

  it('should list leaves with filters, pagination and parsed JSON fields', async () => {
    mockPrisma.leave.findMany.mockResolvedValue([
      {
        id: 'leave-1',
        playerId: 'player-1',
        status: 'pending',
        dates: '["2026-04-08","2026-04-09"]',
        scheduleIds: '["schedule-1"]',
      },
    ]);
    mockPrisma.leave.count.mockResolvedValue(3);

    const response = await GET(
      createMockRequest(undefined, {
        playerId: 'player-1',
        status: 'pending',
        limit: '1',
        offset: '1',
      })
    );
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.page).toBe(2);
    expect(result.data.totalPages).toBe(3);
    expect(result.data.leaves[0].dates).toEqual(['2026-04-08', '2026-04-09']);
    expect(result.data.leaves[0].scheduleIds).toEqual(['schedule-1']);
    expect(mockPrisma.leave.findMany).toHaveBeenCalledWith({
      where: { playerId: 'player-1', status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 1,
      skip: 1,
    });
    expect(mockPrisma.leave.count).toHaveBeenCalledWith({
      where: { playerId: 'player-1', status: 'pending' },
    });
  });
});

describe('POST /api/leaves', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return auth response when admin verification fails', async () => {
    verifyAuth.mockResolvedValueOnce(createAuthFailure(403));

    const response = await POST(createMockRequest({ playerId: 'player-1' }));
    expect(response.status).toBe(403);
  });

  it('should return 400 when required fields are missing', async () => {
    const response = await POST(createMockRequest({ playerId: 'player-1', playerName: '张三' }));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.error).toContain('缺少必填字段');
  });

  it('should create a leave request and stringify array fields', async () => {
    mockPrisma.leave.create.mockResolvedValue({ id: 'leave-1', status: 'pending' });

    const response = await POST(
      createMockRequest({
        playerId: 'player-1',
        playerName: '张三',
        guardianId: 'guardian-1',
        guardianName: '张爸爸',
        leaveType: 'absence',
        reason: '生病',
        dates: ['2026-04-08'],
        scheduleIds: ['schedule-1', 'schedule-2'],
        totalHours: 3,
      })
    );
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.leave.create).toHaveBeenCalledWith({
      data: {
        playerId: 'player-1',
        playerName: '张三',
        guardianId: 'guardian-1',
        guardianName: '张爸爸',
        leaveType: 'absence',
        reason: '生病',
        dates: JSON.stringify(['2026-04-08']),
        scheduleIds: JSON.stringify(['schedule-1', 'schedule-2']),
        totalHours: 3,
        status: 'pending',
      },
    });
  });
});
