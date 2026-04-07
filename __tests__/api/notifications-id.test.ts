import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import mockPrisma, { resetPrismaMocks, createAuthSuccess } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({ verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()) }));

const { GET, PUT, DELETE } = require('@/app/api/notifications/[id]/route');

describe('GET /api/notifications/[id]', () => {
  beforeEach(() => resetPrismaMocks());

  test('returns notification with player and template', async () => {
    const mockNotif = {
      id: 'notif-1',
      title: 'test',
      player: { id: 'p1', name: '学员1' },
      template: { id: 't1', code: 'code1', name: '模板1' },
    };
    mockPrisma.notification.findUnique.mockResolvedValue(mockNotif);

    const req = createMockRequest();
    const res = await GET(req, { params: Promise.resolve({ id: 'notif-1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.notification.id).toBe('notif-1');
    expect(data.notification.template).toBeDefined();
    expect(mockPrisma.notification.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'notif-1' },
        include: expect.objectContaining({
          player: { select: { id: true, name: true } },
          template: true,
        }),
      })
    );
  });

  test('returns 404 when notification not found', async () => {
    mockPrisma.notification.findUnique.mockResolvedValue(null);

    const req = createMockRequest();
    const res = await GET(req, { params: Promise.resolve({ id: 'nonexistent' }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('通知不存在');
  });
});

describe('PUT /api/notifications/[id]', () => {
  beforeEach(() => resetPrismaMocks());

  test('updates notification status to read with readAt', async () => {
    const mockNotif = { id: 'notif-1', status: 'read', readAt: expect.any(Date), player: { id: 'p1', name: '学员1' } };
    mockPrisma.notification.update.mockResolvedValue(mockNotif);

    const req = createMockRequest({ status: 'read' });
    const res = await PUT(req, { params: Promise.resolve({ id: 'notif-1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.notification.status).toBe('read');
    expect(mockPrisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'notif-1' },
        data: expect.objectContaining({ status: 'read', readAt: expect.any(Date) }),
      })
    );
  });

  test('updates notification status to sent with sentAt', async () => {
    mockPrisma.notification.update.mockResolvedValue({ id: 'notif-1', status: 'sent', sentAt: expect.any(Date) });

    const req = createMockRequest({ status: 'sent' });
    const res = await PUT(req, { params: Promise.resolve({ id: 'notif-1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'sent', sentAt: expect.any(Date) }),
      })
    );
  });
});

describe('DELETE /api/notifications/[id]', () => {
  beforeEach(() => resetPrismaMocks());

  test('deletes a notification and returns success message', async () => {
    mockPrisma.notification.delete.mockResolvedValue({ id: 'notif-1' });

    const req = createMockRequest();
    const res = await DELETE(req, { params: Promise.resolve({ id: 'notif-1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe('删除成功');
    expect(mockPrisma.notification.delete).toHaveBeenCalledWith({ where: { id: 'notif-1' } });
  });
});
