import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import mockPrisma, { resetPrismaMocks, createMockCoach, createAuthSuccess } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({ verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()) }));
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$hashednewpassword'),
}));

const bcrypt = require('bcryptjs');
const { POST } = require('@/app/api/coaches/[id]/reset-password/route');

describe('POST /api/coaches/[id]/reset-password', () => {
  beforeEach(() => {
    resetPrismaMocks();
    jest.clearAllMocks();
    // Re-mock bcrypt after resetPrismaMocks clears all mocks
    bcrypt.hash.mockResolvedValue('$2a$10$hashednewpassword');
  });

  test('resets password successfully for existing coach', async () => {
    mockPrisma.coach.findUnique.mockResolvedValue(createMockCoach({ id: 'coach-1' }));
    mockPrisma.coach.update.mockResolvedValue({ id: 'coach-1', password: '$2a$10$hashednewpassword' });

    const req = createMockRequest({ newPassword: 'newpass123' });
    const res = await POST(req, { params: { id: 'coach-1' } });
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(200);
    expect(data.data.success).toBe(true);
    expect(data.data.message).toBe('密码重置成功');
    expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 10);
    expect(mockPrisma.coach.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'coach-1' },
        data: { password: '$2a$10$hashednewpassword' },
      })
    );
  });

  test('returns 400 when newPassword is less than 6 characters', async () => {
    const req = createMockRequest({ newPassword: '12345' });
    const res = await POST(req, { params: { id: 'coach-1' } });
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(400);
    expect(data.data.success).toBe(false);
    expect(data.data.message).toBe('新密码长度至少6位');
    expect(mockPrisma.coach.update).not.toHaveBeenCalled();
  });

  test('returns 400 when newPassword is empty', async () => {
    const req = createMockRequest({ newPassword: '' });
    const res = await POST(req, { params: { id: 'coach-1' } });
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(400);
    expect(data.data.message).toBe('新密码长度至少6位');
  });

  test('returns 404 when coach does not exist', async () => {
    mockPrisma.coach.findUnique.mockResolvedValue(null);

    const req = createMockRequest({ newPassword: 'newpass123' });
    const res = await POST(req, { params: { id: 'nonexistent' } });
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(404);
    expect(data.data.success).toBe(false);
    expect(data.data.message).toBe('教练不存在');
    expect(mockPrisma.coach.update).not.toHaveBeenCalled();
  });

  test('accepts password with exactly 6 characters', async () => {
    mockPrisma.coach.findUnique.mockResolvedValue(createMockCoach({ id: 'coach-2' }));
    mockPrisma.coach.update.mockResolvedValue({ id: 'coach-2', password: '$2a$10$hashed' });

    const req = createMockRequest({ newPassword: '123456' });
    const res = await POST(req, { params: { id: 'coach-2' } });
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(200);
    expect(data.data.success).toBe(true);
  });
});
