import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockCoach, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

// Mock verifyAuth
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn(),
}));

// Mock the database module
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

const { GET, POST } = require('@/app/api/coaches/route');
const { verifyAuth } = require('@/lib/auth-middleware');
const bcrypt = require('bcryptjs') as jest.Mocked<typeof import('bcryptjs')>;

describe('GET /api/coaches', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 403 for non-admin', async () => {
    verifyAuth.mockResolvedValue({
      success: false,
      response: { status: 403, json: async () => ({ success: false, message: '权限不足' }) },
    });

    const request = createMockRequest();
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it('should return coaches list for admin', async () => {
    verifyAuth.mockResolvedValue({
      success: true,
      user: { id: 'admin-1', email: 'admin@test.com', role: 'admin' },
      coach: createMockCoach({ role: 'admin' }),
    });

    const coaches = [
      createMockCoach({ id: 'c1', name: '教练A' }),
      createMockCoach({ id: 'c2', name: '教练B' }),
    ];
    mockPrisma.coach.findMany.mockResolvedValue(coaches);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.total).toBe(2);
  });

  it('should filter by campusId', async () => {
    verifyAuth.mockResolvedValue({
      success: true,
      user: { id: 'admin-1', email: 'admin@test.com', role: 'admin' },
      coach: createMockCoach({ role: 'admin' }),
    });
    mockPrisma.coach.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { campusId: 'campus-1' });
    await GET(request);

    expect(mockPrisma.coach.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campusId: 'campus-1' },
      })
    );
  });
});

describe('POST /api/coaches', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue({
      success: true,
      user: { id: 'admin-1', email: 'admin@test.com', role: 'admin' },
      coach: createMockCoach({ role: 'admin' }),
    });
    bcrypt.hash.mockResolvedValue('hashed-pwd' as never);
  });

  it('should return 400 when name is missing', async () => {
    const request = createMockRequest({ phone: '13800000000' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.message).toContain('姓名和手机号是必填项');
  });

  it('should return 400 when phone is missing', async () => {
    const request = createMockRequest({ name: '测试' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
  });

  it('should return 400 when phone already exists', async () => {
    mockPrisma.coach.findUnique.mockResolvedValue(createMockCoach({ phone: '13800000000' }));

    const request = createMockRequest({ name: '新教练', phone: '13800000000' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.message).toContain('该手机号已被使用');
  });

  it('should return 400 when email already exists', async () => {
    mockPrisma.coach.findUnique.mockResolvedValue(null); // phone not taken
    mockPrisma.coach.findFirst.mockResolvedValue(createMockCoach({ email: 'existing@test.com' }));

    const request = createMockRequest({ name: '新教练', phone: '13900000000', email: 'existing@test.com' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.message).toContain('该邮箱已被使用');
  });

  it('should create coach with default password 123456', async () => {
    mockPrisma.coach.findUnique.mockResolvedValue(null);
    mockPrisma.coach.findFirst.mockResolvedValue(null);
    mockPrisma.coach.create.mockResolvedValue(createMockCoach({ name: '新教练' }));

    const request = createMockRequest({ name: '新教练', phone: '13800000000' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(201);
    expect(result.data.success).toBe(true);
    expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10); // default password
  });

  it('should create coach with provided password', async () => {
    mockPrisma.coach.findUnique.mockResolvedValue(null);
    mockPrisma.coach.findFirst.mockResolvedValue(null);
    mockPrisma.coach.create.mockResolvedValue(createMockCoach());

    await POST(createMockRequest({ name: '测试', phone: '13800000000', password: 'mypassword' }));

    expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 10);
  });

  it('should set role to coach by default', async () => {
    mockPrisma.coach.findUnique.mockResolvedValue(null);
    mockPrisma.coach.findFirst.mockResolvedValue(null);
    mockPrisma.coach.create.mockResolvedValue(createMockCoach());

    await POST(createMockRequest({ name: '测试', phone: '13800000000' }));

    expect(mockPrisma.coach.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'coach', status: 'active' }),
      })
    );
  });
});
