import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import mockPrisma, { resetPrismaMocks, createAuthSuccess } from '../helpers/mockPrisma';
import { createMockRequest } from '../helpers/mockRequest';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/auth-middleware', () => ({ verifyAuth: jest.fn().mockResolvedValue(createAuthSuccess()) }));

// Mock notificationService with spy implementations
const mockOnTrainingCompleted = jest.fn();
const mockSendBulkNotification = jest.fn();
const mockGetNotificationStats = jest.fn();
const mockRunAllAutoChecks = jest.fn();

jest.mock('@/server/services/notificationService', () => ({
  onTrainingCompleted: (...args: unknown[]) => mockOnTrainingCompleted(...args),
  sendBulkNotification: (...args: unknown[]) => mockSendBulkNotification(...args),
  getNotificationStats: (...args: unknown[]) => mockGetNotificationStats(...args),
  runAllAutoChecks: (...args: unknown[]) => mockRunAllAutoChecks(...args),
}));

const triggerRoute = require('@/app/api/notifications/trigger/route');
const bulkRoute = require('@/app/api/notifications/trigger/bulk/route');
const statsRoute = require('@/app/api/notifications/stats/route');
const checkRoute = require('@/app/api/notifications/check/route');

describe('POST /api/notifications/trigger', () => {
  beforeEach(() => {
    resetPrismaMocks();
    mockOnTrainingCompleted.mockReset();
  });

  test('returns 400 when planId is missing', async () => {
    const req = createMockRequest({ records: [{ playerId: 'p1', playerName: '张三', attendance: 'present' }] });
    const res = await triggerRoute.POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('缺少必要参数');
  });

  test('returns 400 when records is missing', async () => {
    const req = createMockRequest({ planId: 'plan-1' });
    const res = await triggerRoute.POST(req);
    expect(res.status).toBe(400);
  });

  test('returns 400 when records is not an array', async () => {
    const req = createMockRequest({ planId: 'plan-1', records: 'invalid' });
    const res = await triggerRoute.POST(req);
    expect(res.status).toBe(400);
  });

  test('calls onTrainingCompleted with correct params and returns result', async () => {
    mockOnTrainingCompleted.mockResolvedValue({ sent: 2, skipped: 1 });

    const records = [
      { playerId: 'p1', playerName: '张三', attendance: 'present', performance: 8, feedback: '不错' },
      { playerId: 'p2', playerName: '李四', attendance: 'absent' },
      { playerId: 'p3', playerName: '王五', attendance: 'late', performance: 7 },
    ];

    const req = createMockRequest({
      planId: 'plan-1',
      planTitle: '运球训练',
      planTheme: '基础运球',
      records,
    });

    const res = await triggerRoute.POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.sent).toBe(2);
    expect(data.skipped).toBe(1);
    expect(data.message).toContain('已发送 2 条训练完成通知');

    expect(mockOnTrainingCompleted).toHaveBeenCalledWith(
      'plan-1',
      '运球训练',
      '基础运球',
      expect.arrayContaining([
        expect.objectContaining({ playerId: 'p1', playerName: '张三' }),
        expect.objectContaining({ playerId: 'p2', playerName: '李四' }),
        expect.objectContaining({ playerId: 'p3', playerName: '王五' }),
      ])
    );
  });

  test('defaults attendance to present when missing', async () => {
    mockOnTrainingCompleted.mockResolvedValue({ sent: 1, skipped: 0 });

    const req = createMockRequest({
      planId: 'plan-2',
      records: [{ playerId: 'p1', playerName: '测试', performance: 9 }],
    });

    await triggerRoute.POST(req);

    expect(mockOnTrainingCompleted).toHaveBeenCalledWith(
      'plan-2',
      expect.any(String),
      undefined,
      expect.arrayContaining([
        expect.objectContaining({ attendance: 'present' }),
      ])
    );
  });

  test('defaults planTitle when missing', async () => {
    mockOnTrainingCompleted.mockResolvedValue({ sent: 0, skipped: 0 });

    const req = createMockRequest({
      planId: 'plan-3',
      records: [],
    });

    await triggerRoute.POST(req);

    expect(mockOnTrainingCompleted).toHaveBeenCalledWith(
      'plan-3',
      '训练课',
      undefined,
      []
    );
  });

  test('returns 500 when service throws', async () => {
    mockOnTrainingCompleted.mockRejectedValue(new Error('DB error'));

    const req = createMockRequest({
      planId: 'plan-1',
      records: [],
    });

    const res = await triggerRoute.POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('触发通知失败');
  });
});

describe('POST /api/notifications/trigger/bulk', () => {
  beforeEach(() => {
    resetPrismaMocks();
    mockSendBulkNotification.mockReset();
  });

  test('returns 400 when playerIds is empty', async () => {
    const req = createMockRequest({ playerIds: [], title: '测试', content: '内容' });
    const res = await bulkRoute.POST(req);
    expect(res.status).toBe(400);
  });

  test('returns 400 when playerIds is not array', async () => {
    const req = createMockRequest({ playerIds: 'invalid', title: '测试', content: '内容' });
    const res = await bulkRoute.POST(req);
    expect(res.status).toBe(400);
  });

  test('returns 400 when title is missing', async () => {
    const req = createMockRequest({ playerIds: ['p1'], content: '内容' });
    const res = await bulkRoute.POST(req);
    expect(res.status).toBe(400);
  });

  test('returns 400 when content is missing', async () => {
    const req = createMockRequest({ playerIds: ['p1'], title: '标题' });
    const res = await bulkRoute.POST(req);
    expect(res.status).toBe(400);
  });

  test('returns 400 when more than 100 players', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `p${i}`);
    const req = createMockRequest({ playerIds: ids, title: '标题', content: '内容' });
    const res = await bulkRoute.POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('100');
  });

  test('sends bulk notification successfully', async () => {
    mockSendBulkNotification.mockResolvedValue({ sent: 3, skipped: 0 });

    const req = createMockRequest({
      playerIds: ['p1', 'p2', 'p3'],
      title: '训练通知',
      content: '明天有训练',
      type: 'system',
    });

    const res = await bulkRoute.POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.sent).toBe(3);
    expect(data.message).toContain('已发送 3 条通知');

    expect(mockSendBulkNotification).toHaveBeenCalledWith({
      playerIds: ['p1', 'p2', 'p3'],
      title: '训练通知',
      content: '明天有训练',
      type: 'system',
      relatedType: undefined,
      relatedId: undefined,
    });
  });

  test('defaults type to system when not provided', async () => {
    mockSendBulkNotification.mockResolvedValue({ sent: 1, skipped: 0 });

    const req = createMockRequest({
      playerIds: ['p1'],
      title: '标题',
      content: '内容',
    });

    await bulkRoute.POST(req);

    expect(mockSendBulkNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'system' })
    );
  });

  test('returns 500 when service throws', async () => {
    mockSendBulkNotification.mockRejectedValue(new Error('DB error'));

    const req = createMockRequest({
      playerIds: ['p1'],
      title: '标题',
      content: '内容',
    });

    const res = await bulkRoute.POST(req);
    expect(res.status).toBe(500);
  });
});

describe('GET /api/notifications/stats', () => {
  beforeEach(() => {
    resetPrismaMocks();
    mockGetNotificationStats.mockReset();
  });

  test('returns notification stats successfully', async () => {
    mockGetNotificationStats.mockResolvedValue({
      total: 100,
      pending: 5,
      sent: 60,
      read: 30,
      failed: 5,
      unreadRate: 50,
      readRate: 50,
      todaySent: 10,
      weekSent: 45,
      byType: { course: 40, reminder: 30, system: 30 },
      byChannel: { in_app: 80, wechat: 20 },
    });

    const req = createMockRequest();
    const res = await statsRoute.GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.stats.total).toBe(100);
    expect(data.stats.readRate).toBe(50);
    expect(data.stats.byType.course).toBe(40);
  });

  test('returns 500 when service throws', async () => {
    mockGetNotificationStats.mockRejectedValue(new Error('DB error'));

    const req = createMockRequest();
    const res = await statsRoute.GET(req);
    expect(res.status).toBe(500);
  });
});

describe('GET /api/notifications/check', () => {
  beforeEach(() => {
    resetPrismaMocks();
    mockRunAllAutoChecks.mockReset();
  });

  test('runs all auto checks and returns results', async () => {
    mockRunAllAutoChecks.mockResolvedValue({
      total: 3,
      details: [
        '课时不足提醒: 张三 - 张爸爸',
        '课程到期提醒: 李四 - 李妈妈',
        '课时不足提醒: 王五 - 王爸爸',
      ],
    });

    const req = createMockRequest();
    const res = await checkRoute.GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.total).toBe(3);
    expect(data.results).toHaveLength(3);
    expect(data.summary).toContain('3 条提醒');
  });

  test('returns 0 total when no alerts needed', async () => {
    mockRunAllAutoChecks.mockResolvedValue({ total: 0, details: [] });

    const req = createMockRequest();
    const res = await checkRoute.GET(req);
    const data = await res.json();
    expect(data.total).toBe(0);
    expect(data.results).toHaveLength(0);
  });

  test('returns 500 when service throws', async () => {
    mockRunAllAutoChecks.mockRejectedValue(new Error('DB error'));

    const req = createMockRequest();
    const res = await checkRoute.GET(req);
    expect(res.status).toBe(500);
  });
});
