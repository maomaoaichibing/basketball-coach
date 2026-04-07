import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import mockPrisma, { resetPrismaMocks } from '../../helpers/mockPrisma';

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));

const {
  onTrainingCompleted,
  checkLowHours,
  checkExpiringCourses,
  runAllAutoChecks,
  sendBulkNotification,
  getNotificationStats,
} = require('@/server/services/notificationService');

describe('notificationService', () => {
  beforeEach(() => resetPrismaMocks());

  describe('onTrainingCompleted', () => {
    test('sends notification for present player with guardian', async () => {
      // No recent notification
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      // Guardian exists
      mockPrisma.guardian.findMany.mockResolvedValue([{ id: 'g1', name: '张爸爸', isPrimary: true }]);
      // Template exists
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue({ id: 't1', code: 'training_completed' });
      // Create succeeds
      mockPrisma.notification.create.mockResolvedValue({ id: 'n1' });

      const result = await onTrainingCompleted('plan-1', '运球训练', '基础运球', [
        { playerId: 'p1', playerName: '张三', attendance: 'present', performance: 8, feedback: '表现不错' },
      ]);

      expect(result.sent).toBe(1);
      expect(result.skipped).toBe(0);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            playerId: 'p1',
            guardianId: 'g1',
            guardianName: '张爸爸',
            type: 'course',
            status: 'sent',
            relatedType: 'plan',
            relatedId: 'plan-1',
          }),
        })
      );
      // Verify content has variable replacements
      const callData = mockPrisma.notification.create.mock.calls[0][0].data;
      expect(callData.content).toContain('张爸爸');
      expect(callData.content).toContain('张三');
      expect(callData.content).toContain('基础运球');
      expect(callData.content).toContain('表现不错');
    });

    test('skips absent players', async () => {
      const result = await onTrainingCompleted('plan-1', '训练', null, [
        { playerId: 'p1', playerName: '张三', attendance: 'absent', performance: null, feedback: null },
      ]);

      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    test('skips when recent notification exists (24h dedup)', async () => {
      // Has recent notification
      mockPrisma.notification.findFirst.mockResolvedValue({ id: 'old-n1' });

      const result = await onTrainingCompleted('plan-1', '训练', null, [
        { playerId: 'p1', playerName: '张三', attendance: 'present', performance: 8, feedback: '好' },
      ]);

      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    test('skips when no guardian found', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockPrisma.guardian.findMany.mockResolvedValue([]); // No guardians

      const result = await onTrainingCompleted('plan-1', '训练', null, [
        { playerId: 'p1', playerName: '张三', attendance: 'present', performance: 8, feedback: '好' },
      ]);

      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(1);
    });

    test('uses default values when performance and feedback are null', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockPrisma.guardian.findMany.mockResolvedValue([{ id: 'g1', name: '李妈妈', isPrimary: true }]);
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue({ id: 't1' });
      mockPrisma.notification.create.mockResolvedValue({ id: 'n1' });

      await onTrainingCompleted('plan-1', '训练', null, [
        { playerId: 'p1', playerName: '李四', attendance: 'present', performance: null, feedback: null },
      ]);

      const callData = mockPrisma.notification.create.mock.calls[0][0].data;
      expect(callData.content).toContain('未评分');
      expect(callData.content).toContain('表现良好，继续保持');
    });

    test('truncates feedback longer than 100 chars', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockPrisma.guardian.findMany.mockResolvedValue([{ id: 'g1', name: '家长', isPrimary: true }]);
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue({ id: 't1' });
      mockPrisma.notification.create.mockResolvedValue({ id: 'n1' });

      const longFeedback = 'A'.repeat(150);
      await onTrainingCompleted('plan-1', '训练', null, [
        { playerId: 'p1', playerName: '张三', attendance: 'present', performance: 9, feedback: longFeedback },
      ]);

      const callData = mockPrisma.notification.create.mock.calls[0][0].data;
      expect(callData.content).toContain('...');
      expect(callData.content).toContain(longFeedback.substring(0, 100));
    });

    test('marks title with late suffix for late attendance', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockPrisma.guardian.findMany.mockResolvedValue([{ id: 'g1', name: '家长', isPrimary: true }]);
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue({ id: 't1' });
      mockPrisma.notification.create.mockResolvedValue({ id: 'n1' });

      await onTrainingCompleted('plan-1', '训练', null, [
        { playerId: 'p1', playerName: '张三', attendance: 'late', performance: 6, feedback: '迟到' },
      ]);

      const callData = mockPrisma.notification.create.mock.calls[0][0].data;
      expect(callData.title).toContain('迟到');
    });

    test('handles multiple records with mixed attendance', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockPrisma.guardian.findMany.mockResolvedValue([{ id: 'g1', name: '家长', isPrimary: true }]);
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue({ id: 't1' });
      mockPrisma.notification.create.mockResolvedValue({ id: 'n1' });

      const result = await onTrainingCompleted('plan-1', '训练', null, [
        { playerId: 'p1', playerName: '张三', attendance: 'present', performance: 8, feedback: '好' },
        { playerId: 'p2', playerName: '李四', attendance: 'absent', performance: null, feedback: null },
        { playerId: 'p3', playerName: '王五', attendance: 'late', performance: 7, feedback: '迟到' },
      ]);

      expect(result.sent).toBe(2);
      expect(result.skipped).toBe(1);
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);
    });

    test('handles create failure gracefully', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockPrisma.guardian.findMany.mockResolvedValue([{ id: 'g1', name: '家长', isPrimary: true }]);
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue({ id: 't1' });
      mockPrisma.notification.create.mockRejectedValue(new Error('DB error'));

      const result = await onTrainingCompleted('plan-1', '训练', null, [
        { playerId: 'p1', playerName: '张三', attendance: 'present', performance: 8, feedback: '好' },
      ]);

      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(1);
    });
  });

  describe('checkLowHours', () => {
    test('sends notification for enrollments with low hours', async () => {
      mockPrisma.courseEnrollment.findMany.mockResolvedValue([
        {
          id: 'enroll-1',
          playerId: 'p1',
          remainingHours: 3,
          player: {
            name: '张三',
            guardians: [{ id: 'g1', name: '张爸爸' }],
          },
          course: { name: '基础班' },
        },
      ]);
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue({
        id: 't1',
        code: 'hours_low',
        title: '课时不足提醒 {{guardianName}}',
        content: '{{playerName}}的{{courseName}}剩余{{remainingHours}}课时',
      });
      mockPrisma.notification.create.mockResolvedValue({ id: 'n1' });

      const result = await checkLowHours(5);

      expect(result.sent).toBe(1);
      expect(result.details).toHaveLength(1);
      expect(result.details[0]).toContain('张三');
      expect(mockPrisma.courseEnrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
            AND: expect.arrayContaining([
              { remainingHours: { lte: 5 } },
              { remainingHours: { gt: 0 } },
            ]),
          }),
        })
      );
    });

    test('skips when no guardian', async () => {
      mockPrisma.courseEnrollment.findMany.mockResolvedValue([
        {
          id: 'enroll-1',
          playerId: 'p1',
          remainingHours: 2,
          player: { name: '张三', guardians: [] }, // No guardians
          course: { name: '基础班' },
        },
      ]);

      const result = await checkLowHours(5);
      expect(result.sent).toBe(0);
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    test('skips when recent notification exists (7 days)', async () => {
      mockPrisma.courseEnrollment.findMany.mockResolvedValue([
        {
          id: 'enroll-1',
          playerId: 'p1',
          remainingHours: 3,
          player: { name: '张三', guardians: [{ id: 'g1', name: '张爸爸' }] },
          course: { name: '基础班' },
        },
      ]);
      mockPrisma.notification.findFirst.mockResolvedValue({ id: 'old' }); // Recent exists

      const result = await checkLowHours(5);
      expect(result.sent).toBe(0);
    });

    test('skips when template not found', async () => {
      mockPrisma.courseEnrollment.findMany.mockResolvedValue([
        {
          id: 'enroll-1',
          playerId: 'p1',
          remainingHours: 3,
          player: { name: '张三', guardians: [{ id: 'g1', name: '张爸爸' }] },
          course: { name: '基础班' },
        },
      ]);
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue(null); // No template

      const result = await checkLowHours(5);
      expect(result.sent).toBe(0);
    });

    test('returns empty when no low-hour enrollments', async () => {
      mockPrisma.courseEnrollment.findMany.mockResolvedValue([]);

      const result = await checkLowHours(5);
      expect(result.sent).toBe(0);
      expect(result.details).toHaveLength(0);
    });
  });

  describe('checkExpiringCourses', () => {
    test('sends notification for expiring enrollments', async () => {
      const expireDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
      mockPrisma.courseEnrollment.findMany.mockResolvedValue([
        {
          id: 'enroll-1',
          playerId: 'p1',
          expireDate,
          player: {
            name: '李四',
            guardians: [{ id: 'g1', name: '李妈妈' }],
          },
          course: { name: '进阶班' },
        },
      ]);
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue({
        id: 't1',
        code: 'course_expiring',
        title: '课程到期提醒 {{guardianName}}',
        content: '{{playerName}}的{{courseName}}将于{{expireDate}}到期',
      });
      mockPrisma.notification.create.mockResolvedValue({ id: 'n1' });

      const result = await checkExpiringCourses(7);

      expect(result.sent).toBe(1);
      expect(result.details[0]).toContain('李四');
      const callData = mockPrisma.notification.create.mock.calls[0][0].data;
      expect(callData.content).toContain('进阶班');
    });

    test('skips when no guardian', async () => {
      const expireDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      mockPrisma.courseEnrollment.findMany.mockResolvedValue([
        {
          id: 'enroll-1',
          playerId: 'p1',
          expireDate,
          player: { name: '李四', guardians: [] },
          course: { name: '进阶班' },
        },
      ]);

      const result = await checkExpiringCourses(7);
      expect(result.sent).toBe(0);
    });

    test('skips when recent notification exists', async () => {
      const expireDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      mockPrisma.courseEnrollment.findMany.mockResolvedValue([
        {
          id: 'enroll-1',
          playerId: 'p1',
          expireDate,
          player: { name: '李四', guardians: [{ id: 'g1', name: '李妈妈' }] },
          course: { name: '进阶班' },
        },
      ]);
      mockPrisma.notification.findFirst.mockResolvedValue({ id: 'old' });

      const result = await checkExpiringCourses(7);
      expect(result.sent).toBe(0);
    });

    test('returns empty when no expiring enrollments', async () => {
      mockPrisma.courseEnrollment.findMany.mockResolvedValue([]);

      const result = await checkExpiringCourses(7);
      expect(result.sent).toBe(0);
    });
  });

  describe('runAllAutoChecks', () => {
    test('combines results from checkLowHours and checkExpiringCourses', async () => {
      // Mock for checkLowHours
      mockPrisma.courseEnrollment.findMany
        .mockResolvedValueOnce([{
          id: 'enroll-1',
          playerId: 'p1',
          remainingHours: 2,
          player: { name: '张三', guardians: [{ id: 'g1', name: '张爸爸' }] },
          course: { name: '基础班' },
        }])
        .mockResolvedValueOnce([{
          id: 'enroll-2',
          playerId: 'p2',
          expireDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          player: { name: '李四', guardians: [{ id: 'g2', name: '李妈妈' }] },
          course: { name: '进阶班' },
        }]);

      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue({
        id: 't1',
        title: '提醒 {{guardianName}}',
        content: '{{playerName}}通知内容',
      });
      mockPrisma.notification.create.mockResolvedValue({ id: 'n1' });

      const result = await runAllAutoChecks();

      expect(result.total).toBe(2);
      expect(result.details).toHaveLength(2);
    });
  });

  describe('sendBulkNotification', () => {
    test('sends notifications to all players', async () => {
      mockPrisma.player.findUnique
        .mockResolvedValueOnce({ id: 'p1', name: '张三', guardians: [{ id: 'g1', name: '张爸爸' }] })
        .mockResolvedValueOnce({ id: 'p2', name: '李四', guardians: [{ id: 'g2', name: '李妈妈' }] });
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({ id: 'n1' });

      const result = await sendBulkNotification({
        playerIds: ['p1', 'p2'],
        title: '训练通知',
        content: '{{playerName}}，明天有训练',
        type: 'system',
      });

      expect(result.sent).toBe(2);
      expect(result.skipped).toBe(0);
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);

      // Verify playerName variable replacement
      const call1 = mockPrisma.notification.create.mock.calls[0][0].data;
      expect(call1.content).toContain('张三');
      expect(call1.content).not.toContain('{{playerName}}');

      const call2 = mockPrisma.notification.create.mock.calls[1][0].data;
      expect(call2.content).toContain('李四');
    });

    test('skips players not found', async () => {
      mockPrisma.player.findUnique.mockResolvedValueOnce(null); // Player not found
      mockPrisma.player.findUnique.mockResolvedValueOnce({ id: 'p2', name: '李四', guardians: [] });

      const result = await sendBulkNotification({
        playerIds: ['p1', 'p2'],
        title: '通知',
        content: '内容',
        type: 'system',
      });

      expect(result.sent).toBe(1);
      expect(result.skipped).toBe(1);
    });

    test('works without guardian', async () => {
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 'p1',
        name: '张三',
        guardians: [], // No guardians
      });
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({ id: 'n1' });

      const result = await sendBulkNotification({
        playerIds: ['p1'],
        title: '通知',
        content: '内容',
        type: 'system',
      });

      expect(result.sent).toBe(1);
      const callData = mockPrisma.notification.create.mock.calls[0][0].data;
      expect(callData.guardianId).toBeUndefined();
    });
  });

  describe('getNotificationStats', () => {
    test('returns correct stats with calculated rates', async () => {
      mockPrisma.notification.count
        .mockResolvedValueOnce(100)    // total
        .mockResolvedValueOnce(5)     // pending
        .mockResolvedValueOnce(60)    // sent
        .mockResolvedValueOnce(30)    // read
        .mockResolvedValueOnce(5)     // failed
        .mockResolvedValueOnce(10)    // todaySent
        .mockResolvedValueOnce(45);   // weekSent

      mockPrisma.notification.groupBy
        .mockResolvedValueOnce([{ type: 'course', _count: 40 }, { type: 'reminder', _count: 30 }])
        .mockResolvedValueOnce([{ channel: 'in_app', _count: 80 }, { channel: 'wechat', _count: 20 }]);

      const stats = await getNotificationStats();

      expect(stats.total).toBe(100);
      expect(stats.pending).toBe(5);
      expect(stats.sent).toBe(60);
      expect(stats.read).toBe(30);
      expect(stats.failed).toBe(5);
      expect(stats.todaySent).toBe(10);
      expect(stats.weekSent).toBe(45);
      expect(stats.readRate).toBe(50); // 30/60 = 50%
      expect(stats.unreadRate).toBe(50); // (60-30)/60 = 50%
      expect(stats.byType.course).toBe(40);
      expect(stats.byChannel.in_app).toBe(80);
    });

    test('handles zero notifications without division by zero', async () => {
      mockPrisma.notification.count.mockResolvedValue(0);
      mockPrisma.notification.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const stats = await getNotificationStats();

      expect(stats.total).toBe(0);
      expect(stats.readRate).toBe(0);
      expect(stats.unreadRate).toBe(0);
      expect(stats.byType).toEqual({});
      expect(stats.byChannel).toEqual({});
    });
  });
});
