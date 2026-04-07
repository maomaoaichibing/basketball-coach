import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import mockPrisma, { resetPrismaMocks, createAuthSuccess } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({ verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()) }));

const { GET, POST } = require('@/app/api/notifications/route');

describe('GET /api/notifications', () => {
  beforeEach(() => resetPrismaMocks());

  test('returns notifications with player and template includes', async () => {
    mockPrisma.notification.findMany.mockResolvedValue([
      { id: 'notif-1', title: 'test', player: { id: 'p1', name: '学员1' }, template: { id: 't1', code: 'code1', name: '模板1' } },
    ]);
    mockPrisma.notification.count.mockResolvedValue(1);

    const req = createMockRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.notifications).toHaveLength(1);
    expect(data.unreadCount).toBe(1);
    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          player: { select: { id: true, name: true } },
          template: { select: { id: true, code: true, name: true } },
        }),
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    );
  });

  test('filters by status, playerId, type, unreadOnly, guardianId', async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);
    mockPrisma.notification.count.mockResolvedValue(0);

    const req = createMockRequest(undefined, {
      status: 'read',
      playerId: 'p1',
      type: 'system',
      unreadOnly: 'true',
      guardianId: 'g1',
    });
    await GET(req);

    // unreadOnly=true overrides status with { in: ['pending', 'sent'] }
    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['pending', 'sent'] },
          playerId: 'p1',
          type: 'system',
          guardianId: 'g1',
        }),
      })
    );
  });

  test('unreadOnly filter overrides status with pending/sent', async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);
    mockPrisma.notification.count.mockResolvedValue(0);

    const req = createMockRequest(undefined, { unreadOnly: 'true' });
    await GET(req);

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { in: ['pending', 'sent'] } }),
      })
    );
  });
});

describe('POST /api/notifications', () => {
  beforeEach(() => resetPrismaMocks());

  test('creates an in_app notification and auto-sends', async () => {
    const mockNotif = { id: 'notif-1', title: 'test', status: 'pending', player: { id: 'p1', name: '学员1' } };
    mockPrisma.notification.create.mockResolvedValue(mockNotif);
    mockPrisma.notification.update.mockResolvedValue({ ...mockNotif, status: 'sent', sentAt: expect.any(Date) });

    const req = createMockRequest({
      playerId: 'p1',
      title: 'test notification',
      content: 'hello',
      type: 'system',
      channel: 'in_app',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.notification.id).toBe('notif-1');
    // Auto-send for immediate in_app notifications (no scheduledAt)
    expect(mockPrisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'notif-1' },
        data: expect.objectContaining({ status: 'sent' }),
      })
    );
  });

  test('creates a scheduled notification without auto-sending', async () => {
    const mockNotif = { id: 'notif-2', title: 'test', status: 'pending' };
    mockPrisma.notification.create.mockResolvedValue(mockNotif);

    const req = createMockRequest({
      title: 'scheduled',
      content: 'future',
      scheduledAt: '2099-01-01T10:00:00Z',
      channel: 'wechat',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    // Should NOT auto-update when scheduled
    expect(mockPrisma.notification.update).not.toHaveBeenCalled();
  });
});
