import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockCoach, createAuthSuccess, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock @/lib/db - checkins uses default import
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}));

// Mock verifyAuth
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()),
}));

const { GET, POST } = require('@/app/api/checkins/route');

describe('GET /api/checkins', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    (verifyAuth as jest.Mock).mockResolvedValueOnce({ success: false, response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) });

    const request = createMockRequest();
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should return paginated checkins list', async () => {
    const mockCheckins = [
      {
        id: 'checkin-1',
        playerId: 'player-1',
        playerName: '张三',
        date: '2024-01-01T00:00:00.000Z',
        checkInType: 'training',
        content: '训练打卡',
        mediaUrls: '["url1","url2"]',
      },
    ];
    mockPrisma.checkIn.findMany.mockResolvedValue(mockCheckins);
    mockPrisma.checkIn.count.mockResolvedValue(1);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.checkins).toHaveLength(1);
    expect(result.data.total).toBe(1);
    expect(result.data.page).toBe(1);
    expect(result.data.pageSize).toBe(20);
    expect(result.data.totalPages).toBe(1);
  });

  it('should parse mediaUrls from JSON string', async () => {
    const mockCheckins = [
      {
        id: 'checkin-1',
        playerId: 'player-1',
        playerName: '张三',
        mediaUrls: '["url1","url2"]',
      },
    ];
    mockPrisma.checkIn.findMany.mockResolvedValue(mockCheckins);
    mockPrisma.checkIn.count.mockResolvedValue(1);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(result.data.checkins[0].mediaUrls).toEqual(['url1', 'url2']);
  });

  it('should filter by playerId', async () => {
    mockPrisma.checkIn.findMany.mockResolvedValue([]);
    mockPrisma.checkIn.count.mockResolvedValue(0);

    const request = createMockRequest(undefined, { playerId: 'player-1' });
    await GET(request);

    expect(mockPrisma.checkIn.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ playerId: 'player-1' }),
      })
    );
  });

  it('should filter by checkInType', async () => {
    mockPrisma.checkIn.findMany.mockResolvedValue([]);
    mockPrisma.checkIn.count.mockResolvedValue(0);

    const request = createMockRequest(undefined, { checkInType: 'training' });
    await GET(request);

    expect(mockPrisma.checkIn.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ checkInType: 'training' }),
      })
    );
  });

  it('should use pagination params', async () => {
    mockPrisma.checkIn.findMany.mockResolvedValue([]);
    mockPrisma.checkIn.count.mockResolvedValue(0);

    const request = createMockRequest(undefined, { limit: '10', offset: '20' });
    await GET(request);

    expect(mockPrisma.checkIn.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 20,
        orderBy: { date: 'desc' },
      })
    );
    expect(mockPrisma.checkIn.count).toHaveBeenCalled();
  });
});

describe('POST /api/checkins', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyAuth } = require('@/lib/auth-middleware');
    (verifyAuth as jest.Mock).mockResolvedValueOnce({ success: false, response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) });

    const request = createMockRequest({ playerId: 'player-1', playerName: '张三', date: '2024-01-01' });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should return 400 when playerId is missing', async () => {
    const request = createMockRequest({ playerName: '张三', date: '2024-01-01' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.error).toContain('缺少必填字段');
  });

  it('should return 400 when playerName is missing', async () => {
    const request = createMockRequest({ playerId: 'player-1', date: '2024-01-01' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
  });

  it('should return 400 when date is missing', async () => {
    const request = createMockRequest({ playerId: 'player-1', playerName: '张三' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
  });

  it('should create checkin with required fields', async () => {
    const mockCheckin = {
      id: 'checkin-1',
      playerId: 'player-1',
      playerName: '张三',
      date: '2024-01-01T00:00:00.000Z',
      checkInType: 'training',
    };
    mockPrisma.checkIn.create.mockResolvedValue(mockCheckin);

    const request = createMockRequest({
      playerId: 'player-1',
      playerName: '张三',
      date: '2024-01-01',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.checkin.id).toBe('checkin-1');
    expect(mockPrisma.checkIn.create).toHaveBeenCalled();
  });

  it('should stringify mediaUrls when array is provided', async () => {
    const mockCheckin = { id: 'checkin-1', playerId: 'player-1' };
    mockPrisma.checkIn.create.mockResolvedValue(mockCheckin);

    const request = createMockRequest({
      playerId: 'player-1',
      playerName: '张三',
      date: '2024-01-01',
      mediaUrls: ['url1', 'url2'],
    });
    await POST(request);

    expect(mockPrisma.checkIn.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        mediaUrls: JSON.stringify(['url1', 'url2']),
      }),
    });
  });

  it('should use default values for optional fields', async () => {
    const mockCheckin = { id: 'checkin-1', playerId: 'player-1' };
    mockPrisma.checkIn.create.mockResolvedValue(mockCheckin);

    const request = createMockRequest({
      playerId: 'player-1',
      playerName: '张三',
      date: '2024-01-01',
      content: '训练内容',
    });
    await POST(request);

    expect(mockPrisma.checkIn.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        checkInType: 'training',
        duration: 0,
        mediaUrls: '[]',
      }),
    });
  });

  it('should return 500 on database error', async () => {
    mockPrisma.checkIn.create.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest({
      playerId: 'player-1',
      playerName: '张三',
      date: '2024-01-01',
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
