import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockCoach, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  JsonWebTokenError: class extends Error {
    constructor() { super('invalid'); this.name = 'JsonWebTokenError'; }
  },
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

const { PATCH } = require('@/app/api/auth/profile/route');
const bcrypt = require('bcryptjs') as jest.Mocked<typeof import('bcryptjs')>;
const jwt = require('jsonwebtoken') as jest.Mocked<typeof import('jsonwebtoken')>;
const { verifyAuth } = require('@/lib/auth-middleware');

describe('GET /api/auth/profile', () => {
  const { GET } = require('@/app/api/auth/profile/route');

  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue({
      success: true,
      user: { id: 'coach-1', email: 'test@test.com', role: 'coach' },
      coach: createMockCoach(),
    });
  });

  it('should return coach profile on success', async () => {
    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.data.id).toBe('coach-1');
  });
});

describe('PATCH /api/auth/profile', () => {
  beforeEach(() => {
    resetPrismaMocks();
    verifyAuth.mockResolvedValue({
      success: true,
      user: { id: 'coach-1', email: 'test@test.com', role: 'coach' },
      coach: createMockCoach(),
    });
  });

  it('should return 400 when no fields to update', async () => {
    const request = createMockRequest({});
    const response = await PATCH(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.message).toContain('没有需要更新的字段');
  });

  it('should update name successfully', async () => {
    mockPrisma.coach.update.mockResolvedValue({
      ...createMockCoach(),
      name: '新名字',
    });

    const request = createMockRequest({ name: '新名字' });
    const response = await PATCH(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(mockPrisma.coach.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'coach-1' },
        data: { name: '新名字' },
      })
    );
  });

  it('should trim whitespace from fields', async () => {
    mockPrisma.coach.update.mockResolvedValue(createMockCoach());

    await PATCH(createMockRequest({ name: '  测试教练  ', phone: ' 13800138000  ' }));

    expect(mockPrisma.coach.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: '测试教练', phone: '13800138000' },
      })
    );
  });

  it('should update multiple fields', async () => {
    mockPrisma.coach.update.mockResolvedValue(createMockCoach());

    await PATCH(createMockRequest({ name: '新名', phone: '13900000000', avatar: 'https://img.com/1.jpg' }));

    expect(mockPrisma.coach.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: '新名',
          phone: '13900000000',
          avatar: 'https://img.com/1.jpg',
        }),
      })
    );
  });

  it('should handle database errors', async () => {
    mockPrisma.coach.update.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest({ name: '测试' });
    const response = await PATCH(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
  });
});
