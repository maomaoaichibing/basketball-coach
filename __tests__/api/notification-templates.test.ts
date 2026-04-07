import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import mockPrisma, { resetPrismaMocks, createAuthSuccess } from '../helpers/mockPrisma';
import { createMockRequest, parseJsonResponse } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({ verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()) }));

const { GET, POST } = require('@/app/api/notification-templates/route');

describe('GET /api/notification-templates', () => {
  beforeEach(() => resetPrismaMocks());

  test('returns existing templates without initialization', async () => {
    const existingTemplates = [{ id: 't1', code: 'hours_low', name: '课时不足提醒' }];
    mockPrisma.notificationTemplate.findMany.mockResolvedValue(existingTemplates);

    const req = createMockRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.templates).toHaveLength(1);
    // Should only call findMany once (no initialization needed)
    expect(mockPrisma.notificationTemplate.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.notificationTemplate.create).not.toHaveBeenCalled();
  });

  test('auto-initializes default templates when none exist', async () => {
    // First call returns empty array, second call returns created templates
    mockPrisma.notificationTemplate.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 't1', code: 'hours_low' },
        { id: 't2', code: 'course_expiring' },
        { id: 't3', code: 'booking_confirmed' },
        { id: 't4', code: 'booking_reminder' },
        { id: 't5', code: 'training_completed' },
        { id: 't6', code: 'assessment_ready' },
      ]);
    mockPrisma.notificationTemplate.create.mockResolvedValue({});

    const req = createMockRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.templates).toHaveLength(6);
    // Should create 6 default templates
    expect(mockPrisma.notificationTemplate.create).toHaveBeenCalledTimes(6);
    // Should call findMany twice: first check, then after init
    expect(mockPrisma.notificationTemplate.findMany).toHaveBeenCalledTimes(2);
  });

  test('orders templates by createdAt desc', async () => {
    mockPrisma.notificationTemplate.findMany.mockResolvedValue([]);

    const req = createMockRequest();
    await GET(req);

    expect(mockPrisma.notificationTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } })
    );
  });
});

describe('POST /api/notification-templates', () => {
  beforeEach(() => resetPrismaMocks());

  test('creates a new notification template', async () => {
    const mockTemplate = { id: 't1', code: 'custom', name: '自定义模板' };
    mockPrisma.notificationTemplate.create.mockResolvedValue(mockTemplate);

    const req = createMockRequest({
      code: 'custom',
      name: '自定义模板',
      title: '自定义标题',
      content: '自定义内容',
      category: 'system',
      priority: 'normal',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.template.id).toBe('t1');
    expect(mockPrisma.notificationTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: 'custom', name: '自定义模板' }),
      })
    );
  });

  test('uses default values for optional fields', async () => {
    mockPrisma.notificationTemplate.create.mockResolvedValue({ id: 't2' });

    const req = createMockRequest({ code: 'test', name: 'Test', title: 'T', content: 'C' });
    await POST(req);

    expect(mockPrisma.notificationTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          category: 'system',
          variables: '[]',
          isActive: true,
          isAutomated: false,
          priority: 'normal',
        }),
      })
    );
  });
});
