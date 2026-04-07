import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import mockPrisma, { resetPrismaMocks, createAuthSuccess } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({ verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()) }));

const { GET, PUT } = require('@/app/api/messages/[id]/route');

describe('GET /api/messages/[id]', () => {
  beforeEach(() => resetPrismaMocks());

  test('returns a message by id', async () => {
    const mockMessage = { id: 'msg-1', content: 'hello', isRead: false };
    mockPrisma.message.findUnique.mockResolvedValue(mockMessage);

    const req = createMockRequest();
    const res = await GET(req, { params: Promise.resolve({ id: 'msg-1' }) });
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(200);
    expect(data.data.success).toBe(true);
    expect(data.data.message.id).toBe('msg-1');
    expect(mockPrisma.message.findUnique).toHaveBeenCalledWith({ where: { id: 'msg-1' } });
  });

  test('returns 404 when message not found', async () => {
    mockPrisma.message.findUnique.mockResolvedValue(null);

    const req = createMockRequest();
    const res = await GET(req, { params: Promise.resolve({ id: 'nonexistent' }) });
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(404);
    expect(data.data.success).toBe(false);
    expect(data.data.error).toBe('消息不存在');
  });
});

describe('PUT /api/messages/[id]', () => {
  beforeEach(() => resetPrismaMocks());

  test('updates message isRead status to true and sets readAt', async () => {
    const updatedMessage = { id: 'msg-1', isRead: true, readAt: expect.any(Date) };
    mockPrisma.message.update.mockResolvedValue(updatedMessage);

    const req = createMockRequest({ isRead: true });
    const res = await PUT(req, { params: Promise.resolve({ id: 'msg-1' }) });
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(200);
    expect(data.data.success).toBe(true);
    expect(mockPrisma.message.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'msg-1' },
        data: expect.objectContaining({
          isRead: true,
          readAt: expect.any(Date),
        }),
      })
    );
  });

  test('updates message isRead to false and clears readAt', async () => {
    mockPrisma.message.update.mockResolvedValue({ id: 'msg-1', isRead: false, readAt: null });

    const req = createMockRequest({ isRead: false });
    const res = await PUT(req, { params: Promise.resolve({ id: 'msg-1' }) });
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(200);
    expect(mockPrisma.message.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isRead: false, readAt: null }),
      })
    );
  });
});
