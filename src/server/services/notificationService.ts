import prisma from '@/lib/db';

// 模板变量替换
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return result;
}

// 创建单条通知
async function createNotification(data: {
  playerId?: string;
  guardianId?: string;
  guardianName?: string;
  templateCode?: string;
  title: string;
  content: string;
  type: string;
  channel?: string;
  relatedType?: string;
  relatedId?: string;
}): Promise<boolean> {
  try {
    let templateId: string | undefined;
    if (data.templateCode) {
      const template = await prisma.notificationTemplate.findFirst({
        where: { code: data.templateCode, isActive: true },
      });
      if (template) {
        templateId = template.id;
      }
    }

    await prisma.notification.create({
      data: {
        templateId,
        playerId: data.playerId,
        guardianId: data.guardianId,
        guardianName: data.guardianName,
        title: data.title,
        content: data.content,
        type: data.type,
        channel: data.channel || 'in_app',
        status: 'sent',
        sentAt: new Date(),
        relatedType: data.relatedType,
        relatedId: data.relatedId,
      },
    });
    return true;
  } catch (error) {
    console.error('创建通知失败:', error);
    return false;
  }
}

// 检查是否在指定时间内已发送过同类通知
async function hasRecentNotification(
  playerId: string,
  templateCode: string,
  hours: number = 24
): Promise<boolean> {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const recent = await prisma.notification.findFirst({
    where: {
      playerId,
      template: { code: templateCode },
      createdAt: { gte: cutoff },
    },
  });
  return !!recent;
}

/**
 * 训练完成事件 - 自动发送训练报告给家长
 */
export async function onTrainingCompleted(
  planId: string,
  planTitle: string,
  planTheme: string | null | undefined,
  records: Array<{
    playerId: string;
    playerName: string;
    attendance: string;
    performance: number | null;
    feedback: string | null;
  }>
): Promise<{ sent: number; skipped: number }> {
  let sent = 0;
  let skipped = 0;

  for (const record of records) {
    // 只给出席和迟到的学员家长发送
    if (record.attendance === 'absent') {
      skipped++;
      continue;
    }

    // 防重复（24小时内）
    if (await hasRecentNotification(record.playerId, 'training_completed', 24)) {
      skipped++;
      continue;
    }

    // 查找监护人
    const guardians = await prisma.guardian.findMany({
      where: { playerId: record.playerId, isPrimary: true },
    });
    const guardian = guardians[0];
    if (!guardian) {
      skipped++;
      continue;
    }

    const feedback = record.feedback || '本次训练表现良好，继续保持！';
    const performance = record.performance != null ? `${record.performance}分` : '未评分';
    const attendanceText = record.attendance === 'late' ? '（迟到）' : '';

    const title = `训练课完成${attendanceText}`;
    const content = replaceVariables(
      '亲爱的{{guardianName}}，您家孩子{{playerName}}今日训练已完成。本次训练主题：{{trainingTheme}}，教练评价：{{coachFeedback}}。综合评分：{{score}}。',
      {
        guardianName: guardian.name,
        playerName: record.playerName,
        trainingTheme: planTheme || planTitle || '综合训练',
        coachFeedback: feedback.length > 100 ? feedback.substring(0, 100) + '...' : feedback,
        score: performance,
      }
    );

    const ok = await createNotification({
      playerId: record.playerId,
      guardianId: guardian.id,
      guardianName: guardian.name,
      templateCode: 'training_completed',
      title,
      content,
      type: 'course',
      relatedType: 'plan',
      relatedId: planId,
    });

    if (ok) sent++;
    else skipped++;
  }

  return { sent, skipped };
}

/**
 * 课时不足检查 - 给剩余课时 <= 阈值的学员家长发通知
 */
export async function checkLowHours(
  threshold: number = 5
): Promise<{ sent: number; details: string[] }> {
  const details: string[] = [];
  let sent = 0;

  const lowHourEnrollments = await prisma.courseEnrollment.findMany({
    where: {
      status: 'active',
      AND: [{ remainingHours: { lte: threshold } }, { remainingHours: { gt: 0 } }],
    },
    include: {
      player: { include: { guardians: true } },
      course: true,
    },
  });

  for (const enrollment of lowHourEnrollments) {
    const guardian = enrollment.player.guardians[0];
    if (!guardian) continue;

    if (await hasRecentNotification(enrollment.playerId, 'hours_low', 168)) continue; // 7天

    const template = await prisma.notificationTemplate.findFirst({
      where: { code: 'hours_low', isActive: true },
    });
    if (!template) continue;

    const variables: Record<string, string> = {
      guardianName: guardian.name,
      playerName: enrollment.player.name,
      courseName: enrollment.course.name,
      remainingHours: enrollment.remainingHours.toString(),
    };

    const ok = await createNotification({
      playerId: enrollment.playerId,
      guardianId: guardian.id,
      guardianName: guardian.name,
      templateCode: 'hours_low',
      title: replaceVariables(template.title, variables),
      content: replaceVariables(template.content, variables),
      type: 'reminder',
      relatedType: 'enrollment',
      relatedId: enrollment.id,
    });

    if (ok) {
      sent++;
      details.push(`课时不足提醒: ${enrollment.player.name} - ${guardian.name}`);
    }
  }

  return { sent, details };
}

/**
 * 课程即将过期检查
 */
export async function checkExpiringCourses(
  daysBeforeExpiry: number = 7
): Promise<{ sent: number; details: string[] }> {
  const details: string[] = [];
  let sent = 0;

  const soonExpiring = new Date(Date.now() + daysBeforeExpiry * 24 * 60 * 60 * 1000);

  const expiringEnrollments = await prisma.courseEnrollment.findMany({
    where: {
      status: 'active',
      expireDate: { lte: soonExpiring, gte: new Date() },
    },
    include: {
      player: { include: { guardians: true } },
      course: true,
    },
  });

  for (const enrollment of expiringEnrollments) {
    const guardian = enrollment.player.guardians[0];
    if (!guardian) continue;

    if (await hasRecentNotification(enrollment.playerId, 'course_expiring', 168)) continue; // 7天

    const template = await prisma.notificationTemplate.findFirst({
      where: { code: 'course_expiring', isActive: true },
    });
    if (!template) continue;

    const variables: Record<string, string> = {
      guardianName: guardian.name,
      playerName: enrollment.player.name,
      courseName: enrollment.course.name,
      expireDate: enrollment.expireDate?.toLocaleDateString('zh-CN') || '未知',
    };

    const ok = await createNotification({
      playerId: enrollment.playerId,
      guardianId: guardian.id,
      guardianName: guardian.name,
      templateCode: 'course_expiring',
      title: replaceVariables(template.title, variables),
      content: replaceVariables(template.content, variables),
      type: 'reminder',
      relatedType: 'enrollment',
      relatedId: enrollment.id,
    });

    if (ok) {
      sent++;
      details.push(`课程到期提醒: ${enrollment.player.name} - ${guardian.name}`);
    }
  }

  return { sent, details };
}

/**
 * 全量自动检查 - 合并所有检查规则
 */
export async function runAllAutoChecks(): Promise<{ total: number; details: string[] }> {
  const details: string[] = [];

  const hoursResult = await checkLowHours(5);
  details.push(...hoursResult.details);

  const expiringResult = await checkExpiringCourses(7);
  details.push(...expiringResult.details);

  return { total: hoursResult.sent + expiringResult.sent, details };
}

/**
 * 批量发送通知
 */
export async function sendBulkNotification(data: {
  playerIds: string[];
  title: string;
  content: string;
  type: string;
  relatedType?: string;
  relatedId?: string;
}): Promise<{ sent: number; skipped: number }> {
  let sent = 0;
  let skipped = 0;

  for (const playerId of data.playerIds) {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { guardians: true },
    });
    if (!player) {
      skipped++;
      continue;
    }

    const guardian = player.guardians[0];
    await createNotification({
      playerId,
      guardianId: guardian?.id,
      guardianName: guardian?.name,
      title: data.title,
      content: data.content.replace(/{{playerName}}/g, player.name),
      type: data.type,
      relatedType: data.relatedType,
      relatedId: data.relatedId,
    });

    sent++;
  }

  return { sent, skipped };
}

/**
 * 获取通知统计数据
 */
export async function getNotificationStats(): Promise<{
  total: number;
  pending: number;
  sent: number;
  read: number;
  failed: number;
  unreadRate: number;
  readRate: number;
  todaySent: number;
  weekSent: number;
  byType: Record<string, number>;
  byChannel: Record<string, number>;
}> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [total, pending, sent, read, failed, todaySent, weekSent] = await Promise.all([
    prisma.notification.count(),
    prisma.notification.count({ where: { status: 'pending' } }),
    prisma.notification.count({ where: { status: 'sent' } }),
    prisma.notification.count({ where: { status: 'read' } }),
    prisma.notification.count({ where: { status: 'failed' } }),
    prisma.notification.count({ where: { sentAt: { gte: todayStart } } }),
    prisma.notification.count({ where: { sentAt: { gte: weekStart } } }),
  ]);

  const typeGroups = await prisma.notification.groupBy({
    by: ['type'],
    _count: true,
  });

  const channelGroups = await prisma.notification.groupBy({
    by: ['channel'],
    _count: true,
  });

  const byType: Record<string, number> = {};
  typeGroups.forEach((g) => {
    byType[g.type] = g._count;
  });

  const byChannel: Record<string, number> = {};
  channelGroups.forEach((g) => {
    byChannel[g.channel] = g._count;
  });

  return {
    total,
    pending,
    sent,
    read,
    failed,
    unreadRate: total > 0 ? Math.round(((sent - read) / sent) * 100) : 0,
    readRate: sent > 0 ? Math.round((read / sent) * 100) : 0,
    todaySent,
    weekSent,
    byType,
    byChannel,
  };
}
