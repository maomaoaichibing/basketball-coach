import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mockPrisma, { createMockPlayer, resetPrismaMocks } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

// Mock verifyAuth to always return success
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuth: jest.fn().mockImplementation(() => Promise.resolve({
    success: true,
    user: { id: 'coach-1', email: 'test@test.com', role: 'coach' },
  })),
}));

// Mock the database module
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

// Import after mock setup
const { GET, POST } = require('@/app/api/players/route');

describe('GET /api/players', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should return all players with no filters', async () => {
    const mockPlayers = [
      createMockPlayer({ id: 'p1', name: '张三', group: 'U10' }),
      createMockPlayer({ id: 'p2', name: '李四', group: 'U8' }),
    ];

    mockPrisma.player.findMany.mockResolvedValue(mockPlayers);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.players).toHaveLength(2);
    expect(result.data.total).toBe(2);
    expect(mockPrisma.player.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        orderBy: [{ group: 'asc' }, { name: 'asc' }],
      })
    );
  });

  it('should filter by group', async () => {
    mockPrisma.player.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { group: 'U10' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockPrisma.player.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { group: 'U10' },
      })
    );
  });

  it('should filter by status', async () => {
    mockPrisma.player.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { status: 'training' });
    await GET(request);

    expect(mockPrisma.player.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'training' },
      })
    );
  });

  it('should search by name, parentName, and parentPhone', async () => {
    mockPrisma.player.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { search: '张' });
    await GET(request);

    expect(mockPrisma.player.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: '张' } },
            { parentName: { contains: '张' } },
            { parentPhone: { contains: '张' } },
          ],
        },
      })
    );
  });

  it('should not filter when group is "all"', async () => {
    mockPrisma.player.findMany.mockResolvedValue([]);

    const request = createMockRequest(undefined, { group: 'all' });
    await GET(request);

    expect(mockPrisma.player.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    );
  });

  it('should calculate age from birthDate', async () => {
    const birthDate = new Date('2016-03-15T00:00:00.000Z');
    mockPrisma.player.findMany.mockResolvedValue([
      createMockPlayer({ birthDate: birthDate.toISOString() }),
    ]);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(result.data.players[0].age).toBeGreaterThan(0);
    expect(typeof result.data.players[0].age).toBe('number');
  });

  it('should provide default values for optional fields', async () => {
    mockPrisma.player.findMany.mockResolvedValue([
      createMockPlayer({
        gender: null,
        school: null,
        parentName: null,
        parentPhone: null,
        parentWechat: null,
      }),
    ]);

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    const player = result.data.players[0];
    expect(player.gender).toBe('male');
    expect(player.school).toBe('');
    expect(player.parentName).toBe('');
    expect(player.parentPhone).toBe('');
    expect(player.parentWechat).toBe('');
  });

  it('should handle database errors', async () => {
    mockPrisma.player.findMany.mockRejectedValue(new Error('Database connection failed'));

    const request = createMockRequest();
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('获取学员列表失败');
  });
});

describe('POST /api/players', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it('should create a new player with valid data', async () => {
    const newPlayer = createMockPlayer({ id: 'new-1', name: '新学员' });
    mockPrisma.player.create.mockResolvedValue(newPlayer);

    const body = {
      name: '新学员',
      birthDate: '2016-03-15',
      gender: 'male',
      group: 'U10',
    };

    const request = createMockRequest(body);
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.player.name).toBe('新学员');
    expect(mockPrisma.player.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: '新学员',
          gender: 'male',
          group: 'U10',
        }),
      })
    );
  });

  it('should set default values for optional fields', async () => {
    const newPlayer = createMockPlayer();
    mockPrisma.player.create.mockResolvedValue(newPlayer);

    const body = {
      name: '测试学员',
      birthDate: '2016-03-15',
    };

    const request = createMockRequest(body);
    await POST(request);

    expect(mockPrisma.player.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gender: 'male',
          group: 'U10',
          status: 'training',
          dribbling: 5,
          passing: 5,
          shooting: 5,
          defending: 5,
          physical: 5,
          tactical: 5,
        }),
      })
    );
  });

  it('should return 400 when name is missing', async () => {
    const request = createMockRequest({ birthDate: '2016-03-15' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('姓名和出生日期是必填项');
  });

  it('should return 400 when birthDate is missing', async () => {
    const request = createMockRequest({ name: '测试' });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.success).toBe(false);
  });

  it('should return 400 when both name and birthDate are missing', async () => {
    const request = createMockRequest({});
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(result.data.success).toBe(false);
  });

  it('should parse height and weight as floats', async () => {
    mockPrisma.player.create.mockResolvedValue(createMockPlayer());

    const request = createMockRequest({
      name: '测试',
      birthDate: '2016-03-15',
      height: '135.5',
      weight: '30.2',
    });
    await POST(request);

    expect(mockPrisma.player.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          height: 135.5,
          weight: 30.2,
        }),
      })
    );
  });

  it('should handle height and weight as null when not provided', async () => {
    mockPrisma.player.create.mockResolvedValue(createMockPlayer());

    const request = createMockRequest({
      name: '测试',
      birthDate: '2016-03-15',
    });
    await POST(request);

    expect(mockPrisma.player.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          height: null,
          weight: null,
        }),
      })
    );
  });

  it('should create guardians when provided', async () => {
    const newPlayer = createMockPlayer();
    mockPrisma.player.create.mockResolvedValue(newPlayer);
    mockPrisma.guardian.create.mockResolvedValue({});

    const guardians = [
      { name: '爸爸', relation: 'father', mobile: '13800138000' },
      { name: '妈妈', relation: 'mother', mobile: '13800138001' },
    ];

    const request = createMockRequest({
      name: '测试',
      birthDate: '2016-03-15',
      guardians,
    });
    await POST(request);

    expect(mockPrisma.guardian.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.guardian.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          playerId: 'player-1',
          name: '爸爸',
          relation: 'father',
        }),
      })
    );
  });

  it('should handle database errors on create', async () => {
    mockPrisma.player.create.mockRejectedValue(new Error('Unique constraint failed'));

    const request = createMockRequest({
      name: '测试',
      birthDate: '2016-03-15',
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('创建学员失败');
  });
});
