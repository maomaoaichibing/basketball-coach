import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockCoach, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock JWT_CONFIG
jest.mock('@/lib/jwt', () => ({
  JWT_CONFIG: {
    secret: 'test-secret-key-for-pwd',
    expiresIn: '7d',
    refreshExpiresIn: '7d',
  },
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  sign: jest.fn(),
  JsonWebTokenError: class extends Error {
    constructor(message?: string) { super(message); this.name = 'JsonWebTokenError'; }
  },
  TokenExpiredError: class extends Error {
    constructor(message?: string) { super(message); this.name = 'TokenExpiredError'; }
  },
}));

// Mock the database module
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

const { POST } = require('@/app/api/auth/change-password/route');
const bcrypt = require('bcryptjs') as jest.Mocked<typeof import('bcryptjs')>;
const jwt = require('jsonwebtoken') as jest.Mocked<typeof import('jsonwebtoken')>;

function createAuthRequest(token: string, body: object) {
  const request = createMockRequest(body);
  Object.defineProperty(request, 'headers', {
    value: new Headers({ Authorization: `Bearer ${token}` }),
  });
  return request;
}

describe('POST /api/auth/change-password', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when no token', async () => {
    const request = createMockRequest({ oldPassword: '123456', newPassword: '654321' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(result.data.success).toBe(false);
  });

  it('should return 400 when missing old password', async () => {
    jwt.verify.mockReturnValue({ id: 'coach-1' });
    const response = await POST(createAuthRequest('token', { newPassword: '654321' }));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.message).toContain('旧密码和新密码是必填项');
  });

  it('should return 400 when new password is too short', async () => {
    jwt.verify.mockReturnValue({ id: 'coach-1' });
    const response = await POST(createAuthRequest('token', { oldPassword: '123456', newPassword: '12345' }));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.message).toContain('新密码长度至少6位');
  });

  it('should return 404 when coach not found', async () => {
    jwt.verify.mockReturnValue({ id: 'coach-1' });
    mockPrisma.coach.findUnique.mockResolvedValue(null);

    const response = await POST(createAuthRequest('token', { oldPassword: '123456', newPassword: '654321' }));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.message).toContain('用户不存在或未设置密码');
  });

  it('should return 404 when coach has no password set', async () => {
    jwt.verify.mockReturnValue({ id: 'coach-1' });
    mockPrisma.coach.findUnique.mockResolvedValue(createMockCoach({ password: null }));

    const response = await POST(createAuthRequest('token', { oldPassword: '123456', newPassword: '654321' }));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
  });

  it('should return 400 when old password is incorrect', async () => {
    jwt.verify.mockReturnValue({ id: 'coach-1' });
    mockPrisma.coach.findUnique.mockResolvedValue(createMockCoach());
    bcrypt.compare.mockResolvedValue(false as never);

    const response = await POST(createAuthRequest('token', { oldPassword: 'wrong-pwd', newPassword: '654321' }));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.message).toContain('旧密码不正确');
  });

  it('should change password successfully', async () => {
    jwt.verify.mockReturnValue({ id: 'coach-1' });
    mockPrisma.coach.findUnique.mockResolvedValue(createMockCoach());
    bcrypt.compare.mockResolvedValue(true as never);
    bcrypt.hash.mockResolvedValue('new-hashed-pwd' as never);
    mockPrisma.coach.update.mockResolvedValue(createMockCoach());

    const response = await POST(createAuthRequest('token', { oldPassword: '123456', newPassword: '654321' }));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.message).toContain('密码修改成功');

    // Verify password was hashed and updated
    expect(bcrypt.hash).toHaveBeenCalledWith('654321', 10);
    expect(mockPrisma.coach.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'coach-1' },
        data: { password: 'new-hashed-pwd' },
      })
    );
  });

  it('should return 401 when token is invalid', async () => {
    jwt.verify.mockImplementation(() => { throw new jwt.JsonWebTokenError('invalid token'); });

    const response = await POST(createAuthRequest('invalid', { oldPassword: '123456', newPassword: '654321' }));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(401);
  });
});
