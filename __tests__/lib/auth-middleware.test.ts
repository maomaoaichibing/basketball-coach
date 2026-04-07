import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockCoach, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock JWT_CONFIG to avoid env var check
jest.mock('@/lib/jwt', () => ({
  JWT_CONFIG: {
    secret: 'test-secret-key-for-middleware',
    expiresIn: '7d',
    refreshExpiresIn: '7d',
  },
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => {
  const actual = jest.requireActual('jsonwebtoken');
  return {
    ...actual,
    verify: jest.fn(),
    sign: jest.fn(),
    decode: jest.fn(),
    TokenExpiredError: class extends Error {
      constructor(message?: string) { super(message); this.name = 'TokenExpiredError'; }
    },
    JsonWebTokenError: class extends Error {
      constructor(message?: string) { super(message); this.name = 'JsonWebTokenError'; }
    },
  };
});

// Mock the database module
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

const jwt = require('jsonwebtoken') as jest.Mocked<typeof import('jsonwebtoken')>;
const { verifyAuth } = require('@/lib/auth-middleware');

function createAuthRequest(token: string) {
  const request = createMockRequest();
  Object.defineProperty(request, 'headers', {
    value: new Headers({ Authorization: `Bearer ${token}` }),
  });
  return request;
}

describe('verifyAuth - auth middleware', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when no Authorization header', async () => {
    const request = createMockRequest();
    const result = await verifyAuth(request);

    expect(result.success).toBe(false);
    const json = await (result as any).response.json();
    expect(json.message).toContain('未登录或登录已过期');
  });

  it('should return 401 when Authorization header has wrong format', async () => {
    const request = createMockRequest();
    Object.defineProperty(request, 'headers', {
      value: new Headers({ Authorization: 'Basic abc123' }),
    });
    const result = await verifyAuth(request);

    expect(result.success).toBe(false);
  });

  it('should return 401 when token is invalid', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

    const result = await verifyAuth(createAuthRequest('bad-token'));

    expect(result.success).toBe(false);
    const json = await (result as any).response.json();
    expect(json.message).toContain('Token 无效');
  });

  it('should return 401 with expired message when token is expired', async () => {
    jwt.verify.mockImplementation(() => { throw new jwt.TokenExpiredError('jwt expired'); });

    const result = await verifyAuth(createAuthRequest('expired-token'));

    expect(result.success).toBe(false);
    const json = await (result as any).response.json();
    expect(json.message).toContain('登录已过期');
  });

  it('should return 401 when coach not found', async () => {
    jwt.verify.mockReturnValue({ id: 'nonexistent', email: 'x@x.com', role: 'coach' });
    mockPrisma.coach.findUnique.mockResolvedValue(null);

    const result = await verifyAuth(createAuthRequest('valid-token'));

    expect(result.success).toBe(false);
    const json = await (result as any).response.json();
    expect(json.message).toContain('用户不存在');
  });

  it('should return 403 when coach is disabled', async () => {
    jwt.verify.mockReturnValue({ id: 'coach-1', email: 'test@test.com', role: 'coach' });
    mockPrisma.coach.findUnique.mockResolvedValue(
      createMockCoach({ status: 'inactive' })
    );

    const result = await verifyAuth(createAuthRequest('valid-token'));

    expect(result.success).toBe(false);
    const json = await (result as any).response.json();
    expect(json.message).toContain('账号已被禁用');
  });

  it('should return success for valid token and active coach', async () => {
    jwt.verify.mockReturnValue({ id: 'coach-1', email: 'test@test.com', role: 'coach' });
    mockPrisma.coach.findUnique.mockResolvedValue(createMockCoach());

    const result = await verifyAuth(createAuthRequest('valid-token'));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.id).toBe('coach-1');
      expect(result.coach.name).toBe('测试教练');
      expect(result.coach.status).toBe('active');
    }
  });

  it('should return 403 when role check fails', async () => {
    jwt.verify.mockReturnValue({ id: 'coach-1', email: 'test@test.com', role: 'coach' });
    mockPrisma.coach.findUnique.mockResolvedValue(createMockCoach({ role: 'coach' }));

    const result = await verifyAuth(createAuthRequest('valid-token'), { roles: ['admin'] });

    expect(result.success).toBe(false);
    const json = await (result as any).response.json();
    expect(json.message).toContain('权限不足');
  });

  it('should pass role check when coach has required role', async () => {
    jwt.verify.mockReturnValue({ id: 'admin-1', email: 'admin@test.com', role: 'admin' });
    mockPrisma.coach.findUnique.mockResolvedValue(createMockCoach({ id: 'admin-1', role: 'admin' }));

    const result = await verifyAuth(createAuthRequest('admin-token'), { roles: ['admin'] });

    expect(result.success).toBe(true);
  });

  it('should return default empty phone when coach.phone is null', async () => {
    jwt.verify.mockReturnValue({ id: 'coach-1', email: 'test@test.com', role: 'coach' });
    mockPrisma.coach.findUnique.mockResolvedValue(createMockCoach({ phone: null }));

    const result = await verifyAuth(createAuthRequest('valid-token'));

    if (result.success) {
      expect(result.coach.phone).toBe('');
    }
  });
});
