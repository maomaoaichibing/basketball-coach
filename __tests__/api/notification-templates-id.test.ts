import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import mockPrisma, { resetPrismaMocks, createAuthSuccess } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({ verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()) }));

const { GET, PUT, DELETE } = require('@/app/api/notification-templates/[id]/route');

describe('GET /api/notification-templates/[id]', () => {
  beforeEach(() => resetPrismaMocks());

  test('returns template by id', async () => {
    const mockTemplate = { id: 't1', code: 'hours_low', name: '课时不足提醒' };
    mockPrisma.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);

    const req = createMockRequest();
    const res = await GET(req, { params: { id: 't1' } });
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(200);
    expect(data.data.success).toBe(true);
    expect(data.data.template.id).toBe('t1');
    expect(mockPrisma.notificationTemplate.findUnique).toHaveBeenCalledWith({ where: { id: 't1' } });
  });

  test('returns 404 when template not found', async () => {
    mockPrisma.notificationTemplate.findUnique.mockResolvedValue(null);

    const req = createMockRequest();
    const res = await GET(req, { params: { id: 'nonexistent' } });
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(404);
    expect(data.data.success).toBe(false);
    expect(data.data.error).toBe('通知模板不存在');
  });
});

describe('PUT /api/notification-templates/[id]', () => {
  beforeEach(() => resetPrismaMocks());

  test('updates an existing template', async () => {
    const existing = { id: 't1', code: 'old', name: '旧模板' };
    const updated = { id: 't1', code: 'old', name: '新模板' };
    mockPrisma.notificationTemplate.findUnique.mockResolvedValue(existing);
    mockPrisma.notificationTemplate.update.mockResolvedValue(updated);

    const req = createMockRequest({ name: '新模板', content: '新内容' });
    const res = await PUT(req, { params: { id: 't1' } });
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(200);
    expect(data.data.success).toBe(true);
    expect(data.data.template.name).toBe('新模板');
    expect(mockPrisma.notificationTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't1' },
        data: expect.objectContaining({ name: '新模板', content: '新内容' }),
      })
    );
  });

  test('returns 404 when template to update does not exist', async () => {
    mockPrisma.notificationTemplate.findUnique.mockResolvedValue(null);

    const req = createMockRequest({ name: 'test' });
    const res = await PUT(req, { params: { id: 'nonexistent' } });
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(404);
    expect(data.data.error).toBe('通知模板不存在');
    expect(mockPrisma.notificationTemplate.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/notification-templates/[id]', () => {
  beforeEach(() => resetPrismaMocks());

  test('deletes an existing template', async () => {
    mockPrisma.notificationTemplate.findUnique.mockResolvedValue({ id: 't1' });
    mockPrisma.notificationTemplate.delete.mockResolvedValue({ id: 't1' });

    const req = createMockRequest();
    const res = await DELETE(req, { params: { id: 't1' } });
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(200);
    expect(data.data.success).toBe(true);
    expect(data.data.message).toBe('通知模板已删除');
    expect(mockPrisma.notificationTemplate.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
  });

  test('returns 404 when template to delete does not exist', async () => {
    mockPrisma.notificationTemplate.findUnique.mockResolvedValue(null);

    const req = createMockRequest();
    const res = await DELETE(req, { params: { id: 'nonexistent' } });
    const data = await parseJsonResponse(res);

    expect(data.status).toBe(404);
    expect(data.data.error).toBe('通知模板不存在');
    expect(mockPrisma.notificationTemplate.delete).not.toHaveBeenCalled();
  });
});
