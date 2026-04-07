import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockCoach, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock JWT_CONFIG
jest.mock('@/lib/jwt', () => ({
  JWT_CONFIG: {
    secret: 'test-secret-key-for-me',
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

const { GET } = require('@/app/api/auth/me/route');
const jwt = require('jsonwebtoken') as jest.Mocked<typeof import('jsonwebtoken')>;

function createAuthRequest(token: string) {
  const request = createMockRequest();
  Object.defineProperty(request, 'headers', {
    value: new Headers({ Authorization: `Bearer ${token}` }),
  });
  return request;
}

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when no token provided', async () => {
    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(result.data.success).toBe(false);
  });

  it('should return 401 when token is invalid', async () => {
    jwt.verify.mockImplementation(() => { throw new jwt.JsonWebTokenError('invalid token'); });

    const response = await GET(createAuthRequest('invalid-token'));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(result.data.message).toContain('Token 无效');
  });

  it('should return 401 when token is expired', async () => {
    jwt.verify.mockImplementation(() => { throw new jwt.TokenExpiredError('jwt expired'); });

    const response = await GET(createAuthRequest('expired-token'));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(result.data.message).toContain('登录已过期');
  });

  it('should return 404 when coach not found', async () => {
    jwt.verify.mockReturnValue({ id: 'nonexistent', email: 'x@x.com', role: 'coach' });
    mockPrisma.coach.findUnique.mockResolvedValue(null);

    const response = await GET(createAuthRequest('valid-token'));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(404);
    expect(result.data.message).toContain('用户不存在');
  });

  it('should return 403 when coach is disabled', async () => {
    jwt.verify.mockReturnValue({ id: 'coach-1', email: 'test@test.com', role: 'coach' });
    mockPrisma.coach.findUnique.mockResolvedValue(
      createMockCoach({ status: 'inactive' })
    );

    const response = await GET(createAuthRequest('valid-token'));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(403);
    expect(result.data.message).toContain('账号已被禁用');
  });

  it('should return user info on success', async () => {
    jwt.verify.mockReturnValue({ id: 'coach-1', email: 'test@test.com', role: 'coach' });
    mockPrisma.coach.findUnique.mockResolvedValue(
      createMockCoach({
        specialties: '["dribbling","shooting"]',
        campus: { id: 'campus-1', name: '总部' },
      })
    );

    const response = await GET(createAuthRequest('valid-token'));
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.data.id).toBe('coach-1');
    expect(result.data.data.email).toBe('test@coach.com');
    expect(result.data.data.name).toBe('测试教练');
    expect(result.data.data.specialties).toEqual(['dribbling', 'shooting']);
    expect(result.data.data.campusName).toBe('总部');
  });

  it('should parse empty specialties as empty array', async () => {
    jwt.verify.mockReturnValue({ id: 'coach-1', email: 'test@test.com', role: 'coach' });
    mockPrisma.coach.findUnique.mockResolvedValue(
      createMockCoach({ specialties: '' })
    );

    const response = await GET(createAuthRequest('valid-token'));
    const result = await parseJsonResponse(response);

    expect(result.data.data.specialties).toEqual([]);
  });
});
