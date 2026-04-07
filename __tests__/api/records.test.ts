import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockPlayer, createMockCoach, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock verifyAuth
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue({
    success: true,
    user: { id: 'coach-1', email: 'test@test.com', role: 'coach' },
    coach: createMockCoach(),
  }),
}));

// Mock the database module
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

const { GET, POST } = require('@/app/api/records/route');
const { GET: GetById, PUT, PATCH, DELETE } = require('@/app/api/records/[id]/route');

describe('GET /api/records', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return records list', async () => {
    const mockRecords = [
      { id: 'r1', playerId: 'p1', planId: 'plan1', attendance: 'present', performance: 8, feedback: '不错', skillScores: '{"dribbling":7}', mediaUrls: '["url1"]', recordedAt: '2024-01-01', player: { id: 'p1', name: '张三', group: 'U10' }, plan: { id: 'plan1', title: '训练1', date: '2024-01-01', group: 'U10', theme: '运球' } },
    ];
    mockPrisma.trainingRecord.findMany.mockResolvedValue(mockRecords);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.records).toHaveLength(1);
    expect(result.data.records[0].playerName).toBe('张三');
    expect(result.data.records[0].skillScores).toEqual({ dribbling: 7 });
    expect(result.data.records[0].mediaUrls).toEqual(['url1']);
  });

  it('should filter by playerId', async () => {
    mockPrisma.trainingRecord.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { playerId: 'p1' });
    await GET(request);

    expect(mockPrisma.trainingRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { playerId: 'p1' },
      })
    );
  });

  it('should filter by planId', async () => {
    mockPrisma.trainingRecord.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { planId: 'plan1' });
    await GET(request);

    expect(mockPrisma.trainingRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { planId: 'plan1' },
      })
    );
  });
});

describe('POST /api/records', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 400 when planId is missing', async () => {
    const request = createMockRequest({ playerId: 'p1' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.error).toContain('教案ID是必填项');
  });

  it('should create record with valid data', async () => {
    mockPrisma.trainingRecord.create.mockResolvedValue({
      id: 'r1', planId: 'plan1', playerId: 'p1', attendance: 'present', skillScores: null, mediaUrls: null,
      player: { id: 'p1', name: '张三', group: 'U10' },
      plan: { id: 'plan1', title: '训练1', date: '2024-01-01' },
    });

    const request = createMockRequest({
      planId: 'plan1',
      playerId: 'p1',
      performance: 8,
      feedback: '表现不错',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.trainingRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          planId: 'plan1',
          playerId: 'p1',
          performance: 8,
          feedback: '表现不错',
        }),
      })
    );
  });

  it('should store skillScores as JSON string', async () => {
    mockPrisma.trainingRecord.create.mockResolvedValue({ id: 'r1' });

    await POST(createMockRequest({
      planId: 'plan1',
      skillScores: { dribbling: 7, shooting: 8 },
    }));

    expect(mockPrisma.trainingRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          skillScores: JSON.stringify({ dribbling: 7, shooting: 8 }),
        }),
      })
    );
  });
});

describe('GET /api/records/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 404 when record not found', async () => {
    mockPrisma.trainingRecord.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await GetById(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
  });

  it('should return record details', async () => {
    mockPrisma.trainingRecord.findUnique.mockResolvedValue({
      id: 'r1', planId: 'plan1', playerId: 'p1', attendance: 'present',
      player: { id: 'p1', name: '张三' },
      plan: { id: 'plan1', title: '训练1' },
    });

    const request = createMockRequest();
    const response = await GetById(request, { params: { id: 'r1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
  });
});

describe('PATCH /api/records/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 404 when record not found', async () => {
    mockPrisma.trainingRecord.findUnique.mockResolvedValue(null);

    const request = createMockRequest({ performance: 9 });
    const response = await PATCH(request, { params: { id: 'nonexistent' } });

    expect(response.status).toBe(404);
  });

  it('should partially update record', async () => {
    mockPrisma.trainingRecord.findUnique.mockResolvedValue({ id: 'r1', attendance: 'present' });
    mockPrisma.trainingRecord.update.mockResolvedValue({ id: 'r1', attendance: 'late', performance: 9 });

    const request = createMockRequest({ attendance: 'late', performance: 9 });
    const response = await PATCH(request, { params: { id: 'r1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.trainingRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r1' },
        data: expect.objectContaining({ attendance: 'late', performance: 9 }),
      })
    );
  });

  it('should stringify skillScores', async () => {
    mockPrisma.trainingRecord.findUnique.mockResolvedValue({ id: 'r1' });
    mockPrisma.trainingRecord.update.mockResolvedValue({ id: 'r1' });

    await PATCH(createMockRequest({ skillScores: { dribbling: 8 } }), { params: { id: 'r1' } });

    expect(mockPrisma.trainingRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          skillScores: JSON.stringify({ dribbling: 8 }),
        }),
      })
    );
  });
});

describe('DELETE /api/records/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 404 when record not found', async () => {
    mockPrisma.trainingRecord.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'nonexistent' } });

    expect(response.status).toBe(404);
  });

  it('should delete record', async () => {
    mockPrisma.trainingRecord.findUnique.mockResolvedValue({ id: 'r1' });
    mockPrisma.trainingRecord.delete.mockResolvedValue({ id: 'r1' });

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'r1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.trainingRecord.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });
});
