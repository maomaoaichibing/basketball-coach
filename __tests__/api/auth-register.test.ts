import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockCoach, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock JWT_CONFIG
jest.mock('@/lib/jwt', () => ({
  JWT_CONFIG: {
    secret: 'test-secret-key-for-register',
    expiresIn: '7d',
    refreshExpiresIn: '7d',
  },
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

// Mock the database module
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

const { POST } = require('@/app/api/auth/register/route');
const bcrypt = require('bcryptjs') as jest.Mocked<typeof import('bcryptjs')>;
const jwt = require('jsonwebtoken') as jest.Mocked<typeof import('jsonwebtoken')>;

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 400 when email is missing', async () => {
    const request = createMockRequest({ password: 'test123', name: '测试' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.success).toBe(false);
    expect(result.data.message).toContain('邮箱、密码、姓名是必填项');
  });

  it('should return 400 when password is missing', async () => {
    const request = createMockRequest({ email: 'test@test.com', name: '测试' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.success).toBe(false);
  });

  it('should return 400 when name is missing', async () => {
    const request = createMockRequest({ email: 'test@test.com', password: 'test123' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
  });

  it('should return 400 when password is too short', async () => {
    const request = createMockRequest({ email: 'test@test.com', password: '12345', name: '测试' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.message).toContain('密码长度至少6位');
  });

  it('should return 400 when email already exists', async () => {
    mockPrisma.coach.findFirst.mockResolvedValue(createMockCoach({ email: 'existing@test.com' }));

    const request = createMockRequest({
      email: 'existing@test.com',
      password: 'test123456',
      name: '测试教练',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.success).toBe(false);
    expect(result.data.message).toContain('该邮箱已注册');
  });

  it('should create a new coach and return token on success', async () => {
    const newCoach = createMockCoach({ id: 'new-coach-1', name: '新教练', email: 'new@test.com', role: 'coach' });
    mockPrisma.coach.findFirst.mockResolvedValue(null);
    mockPrisma.coach.create.mockResolvedValue(newCoach);
    bcrypt.hash.mockResolvedValue('hashed-password' as never);
    jwt.sign.mockReturnValue('mock-jwt-token' as any);

    const request = createMockRequest({
      email: 'new@test.com',
      password: 'test123456',
      name: '新教练',
      phone: '13800138000',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.data.token).toBe('mock-jwt-token');
    expect(result.data.data.user.name).toBe('新教练');
    expect(result.data.data.user.role).toBe('coach');

    // Verify coach was created with correct role
    expect(mockPrisma.coach.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'new@test.com',
          name: '新教练',
          role: 'coach', // 注册固定为普通教练
          status: 'active',
        }),
      })
    );
  });

  it('should set role to coach regardless of input', async () => {
    const newCoach = createMockCoach({ role: 'coach' });
    mockPrisma.coach.findFirst.mockResolvedValue(null);
    mockPrisma.coach.create.mockResolvedValue(newCoach);
    bcrypt.hash.mockResolvedValue('hashed' as never);
    jwt.sign.mockReturnValue('token' as any);

    await POST(createMockRequest({
      email: 'test@test.com',
      password: '123456',
      name: '测试',
    }));

    // Verify that role is always 'coach'
    expect(mockPrisma.coach.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'coach' }),
      })
    );
  });

  it('should generate placeholder phone when not provided', async () => {
    mockPrisma.coach.findFirst.mockResolvedValue(null);
    mockPrisma.coach.create.mockResolvedValue(createMockCoach());
    bcrypt.hash.mockResolvedValue('hashed' as never);
    jwt.sign.mockReturnValue('token' as any);

    await POST(createMockRequest({
      email: 'test@test.com',
      password: '123456',
      name: '测试',
    }));

    const createCall = mockPrisma.coach.create.mock.calls[0][0];
    expect(createCall.data.phone).toMatch(/^reg_\d+$/);
  });

  it('should handle database errors', async () => {
    mockPrisma.coach.findFirst.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest({
      email: 'test@test.com',
      password: '123456',
      name: '测试',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
    expect(result.data.message).toContain('服务器错误');
  });
});
