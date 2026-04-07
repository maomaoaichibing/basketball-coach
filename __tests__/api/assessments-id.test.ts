import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockPlayer, createMockCoach, createAuthSuccess, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock @/lib/db - assessments/[id] uses default import
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}));

// Mock verifyAuth
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()),
}));

const { GET, PUT, DELETE } = require('@/app/api/assessments/[id]/route');

describe('GET /api/assessments/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    (verifyAuth as jest.Mock).mockResolvedValueOnce({ success: false, response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) });

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'assessment-1' } });

    expect(response.status).toBe(401);
  });

  it('should return 404 when assessment not found', async () => {
    mockPrisma.playerAssessment.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('评估记录不存在');
  });

  it('should return assessment with player include', async () => {
    const mockAssessment = {
      id: 'assessment-1',
      playerId: 'player-1',
      dribbling: 7,
      passing: 8,
      overall: 8,
      player: { id: 'player-1', name: '张三' },
    };
    mockPrisma.playerAssessment.findUnique.mockResolvedValue(mockAssessment);

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'assessment-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.assessment.id).toBe('assessment-1');
    expect(result.data.assessment.player.name).toBe('张三');
  });
});

describe('PUT /api/assessments/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    (verifyAuth as jest.Mock).mockResolvedValueOnce({ success: false, response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) });

    const request = createMockRequest({ overall: 9 });
    const response = await PUT(request, { params: { id: 'assessment-1' } });

    expect(response.status).toBe(401);
  });

  it('should return 404 when assessment not found', async () => {
    mockPrisma.playerAssessment.findUnique.mockResolvedValue(null);

    const request = createMockRequest({ overall: 9 });
    const response = await PUT(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('评估记录不存在');
  });

  it('should check existing before updating', async () => {
    mockPrisma.playerAssessment.findUnique.mockResolvedValue({ id: 'assessment-1' });
    mockPrisma.playerAssessment.update.mockResolvedValue({ id: 'assessment-1' });

    const request = createMockRequest({ overall: 9, notes: '表现优秀' });
    await PUT(request, { params: { id: 'assessment-1' } });

    expect(mockPrisma.playerAssessment.findUnique).toHaveBeenCalledWith({ where: { id: 'assessment-1' } });
    expect(mockPrisma.playerAssessment.update).toHaveBeenCalled();
  });

  it('should update assessment fields', async () => {
    mockPrisma.playerAssessment.findUnique.mockResolvedValue({ id: 'assessment-1' });
    mockPrisma.playerAssessment.update.mockResolvedValue({ id: 'assessment-1', overall: 9, notes: '表现优秀' });

    const request = createMockRequest({
      dribbling: 9,
      passing: 9,
      shooting: 9,
      defending: 9,
      physical: 9,
      tactical: 9,
      overall: 9,
      notes: '表现优秀',
    });
    const response = await PUT(request, { params: { id: 'assessment-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.playerAssessment.update).toHaveBeenCalledWith({
      where: { id: 'assessment-1' },
      data: expect.objectContaining({
        overall: 9,
        notes: '表现优秀',
      }),
    });
  });

  it('should return 500 on update error', async () => {
    mockPrisma.playerAssessment.findUnique.mockResolvedValue({ id: 'assessment-1' });
    mockPrisma.playerAssessment.update.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest({ overall: 9 });
    const response = await PUT(request, { params: { id: 'assessment-1' } });

    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/assessments/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    (verifyAuth as jest.Mock).mockResolvedValueOnce({ success: false, response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) });

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'assessment-1' } });

    expect(response.status).toBe(401);
  });

  it('should return 404 when assessment not found', async () => {
    mockPrisma.playerAssessment.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'nonexistent' } });

    expect(response.status).toBe(404);
  });

  it('should check existing before deleting', async () => {
    mockPrisma.playerAssessment.findUnique.mockResolvedValue({ id: 'assessment-1' });
    mockPrisma.playerAssessment.delete.mockResolvedValue({ id: 'assessment-1' });

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'assessment-1' } });

    expect(mockPrisma.playerAssessment.findUnique).toHaveBeenCalledWith({ where: { id: 'assessment-1' } });
    expect(mockPrisma.playerAssessment.delete).toHaveBeenCalled();
  });

  it('should delete assessment', async () => {
    mockPrisma.playerAssessment.findUnique.mockResolvedValue({ id: 'assessment-1' });
    mockPrisma.playerAssessment.delete.mockResolvedValue({ id: 'assessment-1' });

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'assessment-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.message).toBe('评估记录已删除');
    expect(mockPrisma.playerAssessment.delete).toHaveBeenCalledWith({ where: { id: 'assessment-1' } });
  });

  it('should return 500 on delete error', async () => {
    mockPrisma.playerAssessment.findUnique.mockResolvedValue({ id: 'assessment-1' });
    mockPrisma.playerAssessment.delete.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'assessment-1' } });

    expect(response.status).toBe(500);
  });
});
