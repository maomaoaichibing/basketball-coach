import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import mockPrisma, { resetPrismaMocks, createMockPlayer, createMockCoach, createAuthSuccess } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({ verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()) }));

const { GET, POST } = require('@/app/api/messages/route');

describe('GET /api/messages', () => {
  beforeEach(() => resetPrismaMocks());

  test('returns messages with pagination defaults', async () => {
    mockPrisma.message.findMany.mockResolvedValue([{ id: 'msg-1', content: 'hello' }]);
    mockPrisma.message.count.mockResolvedValue(1);
    mockPrisma.message.count.mockResolvedValueOnce(1);
    mockPrisma.message.count.mockResolvedValueOnce(0);

    const req = createMockRequest();
    const res = await GET(req);
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(200);
    expect(data.data.success).toBe(true);
    expect(data.data.messages).toHaveLength(1);
    expect(data.data.total).toBe(1);
    expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' }, take: 50, skip: 0 })
    );
  });

  test('filters by playerId, senderId, receiverId, and isRead', async () => {
    mockPrisma.message.findMany.mockResolvedValue([]);
    mockPrisma.message.count.mockResolvedValueOnce(0);
    mockPrisma.message.count.mockResolvedValueOnce(0);

    const req = createMockRequest(undefined, {
      playerId: 'player-1',
      senderId: 'coach-1',
      receiverId: 'coach-2',
      isRead: 'true',
    });
    const res = await GET(req);
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(200);
    expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { playerId: 'player-1', senderId: 'coach-1', receiverId: 'coach-2', isRead: true },
      })
    );
  });

  test('supports custom limit and offset', async () => {
    mockPrisma.message.findMany.mockResolvedValue([]);
    mockPrisma.message.count.mockResolvedValueOnce(0);
    mockPrisma.message.count.mockResolvedValueOnce(0);

    const req = createMockRequest(undefined, { limit: '10', offset: '20' });
    await GET(req);

    expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 })
    );
  });

  test('returns unreadCount when receiverId is provided', async () => {
    mockPrisma.message.findMany.mockResolvedValue([]);
    mockPrisma.message.count.mockResolvedValueOnce(5);
    mockPrisma.message.count.mockResolvedValueOnce(3);

    const req = createMockRequest(undefined, { receiverId: 'coach-1' });
    const res = await GET(req);
    const data = await parseJsonResponse(res);

    expect(data.data.unreadCount).toBe(3);
    expect(mockPrisma.message.count).toHaveBeenLastCalledWith({
      where: { isRead: false, receiverId: 'coach-1' },
    });
  });

  test('POST creates a message with required fields', async () => {
    const mockMessage = { id: 'msg-1', senderId: 'coach-1', content: 'hello' };
    mockPrisma.message.create.mockResolvedValue(mockMessage);

    const req = createMockRequest({
      senderId: 'coach-1',
      senderName: '张教练',
      content: 'hello',
      playerId: 'player-1',
    });
    const res = await POST(req);
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(200);
    expect(data.data.success).toBe(true);
    expect(data.data.message.id).toBe('msg-1');
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ senderId: 'coach-1', senderName: '张教练', content: 'hello' }),
      })
    );
  });

  test('POST returns 400 when missing required fields', async () => {
    const req = createMockRequest({ senderId: 'coach-1' });
    const res = await POST(req);
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(400);
    expect(data.data.success).toBe(false);
  });
});
