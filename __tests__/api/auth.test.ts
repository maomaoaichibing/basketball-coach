import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockCoach, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

// Mock the database module (override the one in auth/login/route.ts)
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

// Import after mock setup
const { POST } = require('@/app/api/auth/login/route');
const bcrypt = require('bcryptjs') as jest.Mocked<typeof import('bcryptjs')>;
const jwt = require('jsonwebtoken') as jest.Mocked<typeof import('jsonwebtoken')>;

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    resetPrismaMocks();
    process.env.JWT_SECRET = 'test-secret-key';
  });

  it('should return 400 when email is missing', async () => {
    const request = createMockRequest({ password: 'test123' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.success).toBe(false);
    expect(result.data.message).toContain('邮箱和密码是必填项');
  });

  it('should return 400 when password is missing', async () => {
    const request = createMockRequest({ email: 'test@coach.com' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.success).toBe(false);
  });

  it('should return 401 when coach not found', async () => {
    mockPrisma.coach.findFirst.mockResolvedValue(null);

    const request = createMockRequest({
      email: 'notfound@coach.com',
      password: 'test123',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(result.data.success).toBe(false);
    expect(result.data.message).toContain('邮箱或密码错误');
  });

  it('should return 401 when coach has no password set', async () => {
    mockPrisma.coach.findFirst.mockResolvedValue(
      createMockCoach({ password: null })
    );

    const request = createMockRequest({
      email: 'test@coach.com',
      password: 'test123',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(result.data.success).toBe(false);
    expect(result.data.message).toContain('账号未设置密码');
  });

  it('should return 401 when password is incorrect', async () => {
    mockPrisma.coach.findFirst.mockResolvedValue(createMockCoach());
    bcrypt.compare.mockImplementation(() => Promise.resolve(false));

    const request = createMockRequest({
      email: 'test@coach.com',
      password: 'wrongpassword',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(result.data.success).toBe(false);
    expect(result.data.message).toContain('邮箱或密码错误');
  });

  it('should return 403 when coach account is disabled', async () => {
    mockPrisma.coach.findFirst.mockResolvedValue(
      createMockCoach({ status: 'inactive' })
    );
    bcrypt.compare.mockImplementation(() => Promise.resolve(true));

    const request = createMockRequest({
      email: 'test@coach.com',
      password: 'correctpassword',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(403);
    expect(result.data.success).toBe(false);
    expect(result.data.message).toContain('账号已被禁用');
  });

  it('should return token and user data on successful login', async () => {
    const coach = createMockCoach({
      name: '王教练',
      email: 'wang@coach.com',
      role: 'head_coach',
    });
    mockPrisma.coach.findFirst.mockResolvedValue(coach);
    bcrypt.compare.mockImplementation(() => Promise.resolve(true));
    jwt.sign.mockReturnValue('mock-jwt-token' as any);

    const request = createMockRequest({
      email: 'wang@coach.com',
      password: 'correctpassword',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.data.token).toBe('mock-jwt-token');
    expect(result.data.data.user.email).toBe('wang@coach.com');
    expect(result.data.data.user.name).toBe('王教练');
    expect(result.data.data.user.role).toBe('head_coach');
    expect(result.data.data.user.id).toBe('coach-1');

    // Verify JWT was called with correct payload
      // JWT_SECRET uses fallback value from the code: 'basketball-coach-dev-secret-2024'
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'coach-1',
          email: 'wang@coach.com',
          role: 'head_coach',
        }),
        'basketball-coach-dev-secret-2024',
        { expiresIn: '7d' }
      );
  });

  it('should handle database errors', async () => {
    mockPrisma.coach.findFirst.mockRejectedValue(new Error('DB connection lost'));

    const request = createMockRequest({
      email: 'test@coach.com',
      password: 'test123',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
    expect(result.data.message).toContain('服务器错误');
  });
});
