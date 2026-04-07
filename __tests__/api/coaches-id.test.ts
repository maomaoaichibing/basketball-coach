import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockCoach, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock verifyAuth
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn(),
}));

// Mock the database module
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

const { GET, PUT, DELETE } = require('@/app/api/coaches/[id]/route');
const { verifyAuth } = require('@/lib/auth-middleware');

describe('GET /api/coaches/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue({
      success: true,
      user: { id: 'coach-1', email: 'test@test.com', role: 'coach' },
      coach: createMockCoach(),
    });
  });

  it('should return 404 when coach not found', async () => {
    mockPrisma.coach.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.message).toContain('教练不存在');
  });

  it('should return coach details', async () => {
    mockPrisma.coach.findUnique.mockResolvedValue(
      createMockCoach({ campus: { id: 'campus-1', name: '总部' } })
    );

    const request = createMockRequest();
    const response = await GET(request, { params: { id: 'coach-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
  });
});

describe('PUT /api/coaches/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue({
      success: true,
      user: { id: 'admin-1', email: 'admin@test.com', role: 'admin' },
      coach: createMockCoach({ role: 'admin' }),
    });
  });

  it('should return 404 when coach not found', async () => {
    mockPrisma.coach.findUnique.mockResolvedValue(null);

    const request = createMockRequest({ name: '新名字' });
    const response = await PUT(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
  });

  it('should return 400 when phone is already used by another coach', async () => {
    mockPrisma.coach.findUnique.mockResolvedValue(createMockCoach({ id: 'coach-1', phone: '13800000000' }));
    mockPrisma.coach.findUnique.mockResolvedValueOnce(createMockCoach({ id: 'coach-1' }));
    mockPrisma.coach.findUnique.mockResolvedValueOnce(createMockCoach({ id: 'coach-2', phone: '13900000000' }));

    const request = createMockRequest({ phone: '13900000000' });
    const response = await PUT(request, { params: { id: 'coach-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.message).toContain('该手机号已被使用');
  });

  it('should update coach successfully', async () => {
    mockPrisma.coach.findUnique.mockResolvedValue(createMockCoach());
    mockPrisma.coach.update.mockResolvedValue(createMockCoach({ name: '新名字' }));

    const request = createMockRequest({ name: '新名字', status: 'on_vacation' });
    const response = await PUT(request, { params: { id: 'coach-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.coach.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'coach-1' },
        data: expect.objectContaining({ name: '新名字', status: 'on_vacation' }),
      })
    );
  });
});

describe('DELETE /api/coaches/[id]', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue({
      success: true,
      user: { id: 'admin-1', email: 'admin@test.com', role: 'admin' },
      coach: createMockCoach({ role: 'admin' }),
    });
  });

  it('should return 400 when deleting self', async () => {
    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'admin-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.message).toContain('不能删除自己的账号');
  });

  it('should return 404 when coach not found', async () => {
    mockPrisma.coach.findUnique.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'nonexistent' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
  });

  it('should delete coach successfully', async () => {
    mockPrisma.coach.findUnique.mockResolvedValue(createMockCoach());
    mockPrisma.coach.delete.mockResolvedValue(createMockCoach());

    const request = createMockRequest();
    const response = await DELETE(request, { params: { id: 'coach-1' } });
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.coach.delete).toHaveBeenCalledWith({ where: { id: 'coach-1' } });
  });
});
