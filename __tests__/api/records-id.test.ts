import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockCoach, createAuthSuccess, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock @/lib/db - records/[id] uses default import `prisma`
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}));

// Mock verifyAuth
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()),
}));

const { GET, PUT, PATCH, DELETE } = require('@/app/api/records/[id]/route');

describe('GET /api/records/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    (verifyAuth as jest.Mock).mockResolvedValueOnce({ success: false, response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) });

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'record-1' } });

    expect(response.status).toBe(401);
  });

  it('should return 404 when record not found', async () => {
    mockPrisma.trainingRecord.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('训练记录不存在');
  });

  it('should return record with player and plan', async () => {
    const mockRecord = {
      id: 'record-1',
      playerId: 'player-1',
      planId: 'plan-1',
      attendance: 'present',
      performance: 8,
      player: { id: 'player-1', name: '张三' },
      plan: { id: 'plan-1', title: '运球训练' },
    };
    mockPrisma.trainingRecord.findUnique.mockResolvedValue(mockRecord);

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'record-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.record.player.name).toBe('张三');
    expect(result.data.record.plan.title).toBe('运球训练');
  });
});

describe('PUT /api/records/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    (verifyAuth as jest.Mock).mockResolvedValueOnce({ success: false, response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) });

    const request = createMockRequest({ attendance: 'late' });
    const response = await PUT(request, { params: { id: 'record-1' } });

    expect(response.status).toBe(401);
  });

  it('should return 404 when record not found', async () => {
    mockPrisma.trainingRecord.findUnique.mockResolvedValue(null);

    const request = createMockRequest({ attendance: 'late' });
    const response = await PUT(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
  });

  it('should check existing record before updating', async () => {
    mockPrisma.trainingRecord.findUnique.mockResolvedValue({ id: 'record-1' });
    mockPrisma.trainingRecord.update.mockResolvedValue({ id: 'record-1' });

    const request = createMockRequest({ attendance: 'late', performance: 9 });
    await PUT(request, { params: { id: 'record-1' } });

    expect(mockPrisma.trainingRecord.findUnique).toHaveBeenCalledWith({ where: { id: 'record-1' } });
    expect(mockPrisma.trainingRecord.update).toHaveBeenCalled();
  });

  it('should update record with all fields', async () => {
    mockPrisma.trainingRecord.findUnique.mockResolvedValue({ id: 'record-1' });
    mockPrisma.trainingRecord.update.mockResolvedValue({ id: 'record-1', attendance: 'late', performance: 9, feedback: '表现不错' });

    const request = createMockRequest({
      attendance: 'late',
      performance: 9,
      feedback: '表现不错',
    });
    const response = await PUT(request, { params: { id: 'record-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
  });
});

describe('PATCH /api/records/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    (verifyAuth as jest.Mock).mockResolvedValueOnce({ success: false, response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) });

    const request = createMockRequest({ performance: 9 });
    const response = await PATCH(request, { params: { id: 'record-1' } });

    expect(response.status).toBe(401);
  });

  it('should return 404 when record not found', async () => {
    mockPrisma.trainingRecord.findUnique.mockResolvedValue(null);

    const request = createMockRequest({ performance: 9 });
    const response = await PATCH(request, { params: { id: 'nonexistent' } });

    expect(response.status).toBe(404);
  });

  it('should partially update record', async () => {
    mockPrisma.trainingRecord.findUnique.mockResolvedValue({ id: 'record-1', attendance: 'present' });
    mockPrisma.trainingRecord.update.mockResolvedValue({ id: 'record-1', attendance: 'late', performance: 9 });

    const request = createMockRequest({ attendance: 'late', performance: 9 });
    const response = await PATCH(request, { params: { id: 'record-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.trainingRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'record-1' },
        data: expect.objectContaining({ attendance: 'late', performance: 9 }),
      })
    );
  });

  it('should stringify skillScores', async () => {
    mockPrisma.trainingRecord.findUnique.mockResolvedValue({ id: 'record-1' });
    mockPrisma.trainingRecord.update.mockResolvedValue({ id: 'record-1' });

    const request = createMockRequest({ skillScores: { dribbling: 8, shooting: 7 } });
    await PATCH(request, { params: { id: 'record-1' } });

    expect(mockPrisma.trainingRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          skillScores: JSON.stringify({ dribbling: 8, shooting: 7 }),
        }),
      })
    );
  });
});

describe('DELETE /api/records/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    (verifyAuth as jest.Mock).mockResolvedValueOnce({ success: false, response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) });

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'record-1' } });

    expect(response.status).toBe(401);
  });

  it('should return 404 when record not found', async () => {
    mockPrisma.trainingRecord.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'nonexistent' } });

    expect(response.status).toBe(404);
  });

  it('should check existing then delete record', async () => {
    mockPrisma.trainingRecord.findUnique.mockResolvedValue({ id: 'record-1' });
    mockPrisma.trainingRecord.delete.mockResolvedValue({ id: 'record-1' });

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'record-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.message).toBe('训练记录已删除');
    expect(mockPrisma.trainingRecord.delete).toHaveBeenCalledWith({ where: { id: 'record-1' } });
  });

  it('should return 500 on delete error', async () => {
    mockPrisma.trainingRecord.findUnique.mockResolvedValue({ id: 'record-1' });
    mockPrisma.trainingRecord.delete.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'record-1' } });

    expect(response.status).toBe(500);
  });
});
