import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockCoach, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock JWT_CONFIG
jest.mock('@/lib/jwt', () => ({
  JWT_CONFIG: {
    secret: 'test-secret-key-for-refresh',
    expiresIn: '7d',
    refreshExpiresIn: '7d',
  },
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  sign: jest.fn(),
  decode: jest.fn(),
  TokenExpiredError: class extends Error {
    constructor(message?: string) { super(message); this.name = 'TokenExpiredError'; }
  },
  JsonWebTokenError: class extends Error {
    constructor(message?: string) { super(message); this.name = 'JsonWebTokenError'; }
  },
}));

// Mock the database module
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

const { POST } = require('@/app/api/auth/refresh/route');
const jwt = require('jsonwebtoken') as jest.Mocked<typeof import('jsonwebtoken')>;

function createAuthRequest(token: string) {
  const request = createMockRequest({});
  Object.defineProperty(request, 'headers', {
    value: new Headers({ Authorization: `Bearer ${token}` }),
  });
  return request;
}

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when no token provided', async () => {
    const request = createMockRequest({});
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(result.data.success).toBe(false);
    expect(result.data.message).toContain('未登录');
  });

  it('should return 401 when token is invalid (not expired)', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

    const response = await POST(createAuthRequest('invalid-token'));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(result.data.message).toContain('Token 无效');
  });

  it('should refresh token when valid', async () => {
    jwt.verify.mockReturnValue({ id: 'coach-1', email: 'test@test.com', role: 'coach' });
    mockPrisma.coach.findUnique.mockResolvedValue(createMockCoach());
    jwt.sign.mockReturnValue('new-token' as any);

    const response = await POST(createAuthRequest('valid-token'));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.data.token).toBe('new-token');
  });

  it('should return 403 when coach is disabled (valid token)', async () => {
    jwt.verify.mockReturnValue({ id: 'coach-1', email: 'test@test.com', role: 'coach' });
    mockPrisma.coach.findUnique.mockResolvedValue(createMockCoach({ status: 'inactive' }));

    const response = await POST(createAuthRequest('valid-token'));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(403);
    expect(result.data.message).toContain('账号已被禁用');
  });

  it('should return 401 when coach not found (valid token)', async () => {
    jwt.verify.mockReturnValue({ id: 'coach-1', email: 'test@test.com', role: 'coach' });
    mockPrisma.coach.findUnique.mockResolvedValue(null);

    const response = await POST(createAuthRequest('valid-token'));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(result.data.message).toContain('用户不存在');
  });

  it('should refresh expired token within grace period', async () => {
    const TokenExpiredError = jwt.TokenExpiredError;
    const expiredPayload = {
      id: 'coach-1',
      email: 'test@test.com',
      role: 'coach',
      exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
    };

    // First verify throws TokenExpiredError
    jwt.verify.mockImplementation(() => { throw new TokenExpiredError('jwt expired'); });
    jwt.decode.mockReturnValue(expiredPayload);
    mockPrisma.coach.findUnique.mockResolvedValue(createMockCoach());
    jwt.sign.mockReturnValue('refreshed-token' as any);

    const response = await POST(createAuthRequest('expired-but-recent-token'));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.data.token).toBe('refreshed-token');
  });

  it('should return 401 when expired token has no payload', async () => {
    const TokenExpiredError = jwt.TokenExpiredError;
    jwt.verify.mockImplementation(() => { throw new TokenExpiredError('jwt expired'); });
    jwt.decode.mockReturnValue(null);

    const response = await POST(createAuthRequest('expired-no-payload'));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(result.data.message).toContain('Token 无效');
  });

  it('should handle database errors', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('unexpected error'); });

    const response = await POST(createAuthRequest('bad-token'));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(401);
  });
});
