import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createAuthSuccess, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()),
}));

const { GET, PUT, DELETE } = require('@/app/api/leaves/[id]/route');
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

describe('GET /api/leaves/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return auth response when verification fails', async () => {
    verifyAuth.mockResolvedValueOnce(createAuthFailure());

    const response = await GET(createMockRequest(), { params: Promise.resolve({ id: 'leave-1' }) });
    expect(response.status).toBe(401);
  });

  it('should return 404 when leave does not exist', async () => {
    mockPrisma.leave.findUnique.mockResolvedValue(null);

    const response = await GET(createMockRequest(), { params: Promise.resolve({ id: 'missing-leave' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('请假记录不存在');
  });

  it('should return leave detail with parsed dates and scheduleIds', async () => {
    mockPrisma.leave.findUnique.mockResolvedValue({
      id: 'leave-1',
      playerName: '张三',
      dates: '["2026-04-08","2026-04-09"]',
      scheduleIds: '["schedule-1"]',
    });

    const response = await GET(createMockRequest(), { params: Promise.resolve({ id: 'leave-1' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.leave.dates).toEqual(['2026-04-08', '2026-04-09']);
    expect(result.data.leave.scheduleIds).toEqual(['schedule-1']);
  });
});

describe('PUT /api/leaves/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue(createAuthSuccess());
  });

  it('should return 404 when leave does not exist before update', async () => {
    mockPrisma.leave.findUnique.mockResolvedValue(null);

    const response = await PUT(
      createMockRequest({ status: 'approved' }),
      { params: Promise.resolve({ id: 'missing-leave' }) }
    );
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.error).toContain('请假记录不存在');
  });

  it('should approve leave and set approver fields', async () => {
    mockPrisma.leave.findUnique.mockResolvedValue({ id: 'leave-1', status: 'pending' });
    mockPrisma.leave.update.mockResolvedValue({ id: 'leave-1', status: 'approved' });

    const response = await PUT(
      createMockRequest({
        status: 'approved',
        approverId: 'coach-1',
        approverName: '测试教练',
        reply: '同意请假',
      }),
      { params: Promise.resolve({ id: 'leave-1' }) }
    );
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.leave.update).toHaveBeenCalledWith({
      where: { id: 'leave-1' },
      data: {
        status: 'approved',
        approverId: 'coach-1',
        approverName: '测试教练',
        reply: '同意请假',
        approvedAt: expect.any(Date),
      },
    });
  });
});

describe('DELETE /api/leaves/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should delete leave record successfully', async () => {
    mockPrisma.leave.delete.mockResolvedValue({ id: 'leave-1' });

    const response = await DELETE(createMockRequest(), { params: Promise.resolve({ id: 'leave-1' }) });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.leave.delete).toHaveBeenCalledWith({ where: { id: 'leave-1' } });
  });
});
