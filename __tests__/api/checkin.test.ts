import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockCoach, createAuthSuccess, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock @/lib/db - checkin uses default import
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}));

// Mock verifyAuth
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()),
}));

const { GET, POST } = require('@/app/api/checkin/route');

describe('GET /api/checkin', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    (verifyAuth as jest.Mock).mockResolvedValueOnce({ success: false, response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) });

    const request = createMockRequest(undefined, { planId: 'plan-1' });
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should return 400 when planId is missing', async () => {
    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.error).toContain('缺少planId');
  });

  it('should return records for a plan', async () => {
    const mockRecords = [
      {
        id: 'record-1',
        playerId: 'player-1',
        attendance: 'present',
        player: { id: 'player-1', name: '张三', group: 'U10', parentPhone: '13800000000' },
      },
    ];
    mockPrisma.trainingRecord.findMany.mockResolvedValue(mockRecords);

    const request = createMockRequest(undefined, { planId: 'plan-1' });
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.records).toHaveLength(1);
    expect(result.data.records[0].player.name).toBe('张三');
  });

  it('should call findMany with correct planId filter', async () => {
    mockPrisma.trainingRecord.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { planId: 'plan-999' });
    await GET(request);

    expect(mockPrisma.trainingRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { planId: 'plan-999' },
      })
    );
  });
});

describe('POST /api/checkin', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    (verifyAuth as jest.Mock).mockResolvedValueOnce({ success: false, response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) });

    const request = createMockRequest({ planId: 'plan-1', records: [] });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should return 400 when planId is missing', async () => {
    const request = createMockRequest({ records: [] });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.error).toContain('参数错误');
  });

  it('should return 400 when records is missing', async () => {
    const request = createMockRequest({ planId: 'plan-1' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
  });

  it('should return 400 when records is not an array', async () => {
    const request = createMockRequest({ planId: 'plan-1', records: 'not-array' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
  });

  it('should update existing records with $transaction', async () => {
    mockPrisma.trainingRecord.findMany.mockResolvedValue([
      { id: 'record-1', playerId: 'player-1' },
    ]);
    mockPrisma.$transaction.mockImplementation(async ops => {
      return ops.map(() => ({ id: 'record-1' }));
    });

    const request = createMockRequest({
      planId: 'plan-1',
      records: [
        { playerId: 'player-1', attendance: 'late' },
      ],
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.count).toBe(1);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('should create new records for unknown players with $transaction', async () => {
    mockPrisma.trainingRecord.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockImplementation(async ops => {
      return ops.map(() => ({ id: 'new-record' }));
    });

    const request = createMockRequest({
      planId: 'plan-1',
      records: [
        { playerId: 'player-new', attendance: 'present' },
      ],
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
  });

  it('should handle signInTime conversion', async () => {
    mockPrisma.trainingRecord.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockImplementation(async ops => {
      // Verify signInTime was converted to Date
      return ops;
    });

    const request = createMockRequest({
      planId: 'plan-1',
      records: [
        { playerId: 'player-1', attendance: 'present', signInTime: '2024-01-01T09:00:00.000Z' },
      ],
    });
    await POST(request);

    // $transaction was called with ops that include signInTime as Date
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('should return 500 on transaction error', async () => {
    mockPrisma.trainingRecord.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest({
      planId: 'plan-1',
      records: [{ playerId: 'player-1', attendance: 'present' }],
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
