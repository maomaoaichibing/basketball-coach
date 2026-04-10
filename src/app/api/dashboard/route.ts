import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/dashboard - 教练工作台数据
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const todayStr = today.toISOString().slice(0, 10);

    // 并行获取所有数据
    const [
      todaySchedules,
      lowHourEnrollments,
      recentPlans,
      recentRecords,
      totalPlayers,
      totalPlans,
      activeGoals,
    ] = await Promise.all([
      // 1. 今日课程
      prisma.schedule.findMany({
        where: { dayOfWeek, status: 'active' },
        include: {
          team: { select: { id: true, name: true } },
          plan: {
            select: { id: true, title: true, group: true, theme: true, duration: true },
          },
        },
        orderBy: [{ startTime: 'asc' }],
      }),

      // 2. 课时预警 - 剩余课时<=4
      prisma.courseEnrollment.findMany({
        where: {
          status: 'active',
          remainingHours: { lte: 4 },
        },
        include: {
          player: { select: { id: true, name: true, group: true } },
          course: { select: { id: true, name: true, type: true } },
        },
        orderBy: { remainingHours: 'asc' },
        take: 10,
      }),

      // 3. 最近教案
      prisma.trainingPlan.findMany({
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          date: true,
          group: true,
          theme: true,
          duration: true,
          location: true,
          generatedBy: true,
          createdAt: true,
        },
      }),

      // 4. 最近训练记录（7天内）
      prisma.trainingRecord.findMany({
        where: {
          createdAt: {
            gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          player: { select: { id: true, name: true, group: true } },
          plan: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // 5. 学员总数
      prisma.player.count({ where: { status: 'active' } }),

      // 6. 教案总数
      prisma.trainingPlan.count(),

      // 7. 进行中的阶段目标
      prisma.playerGoal.findMany({
        where: { status: 'active' },
        include: {
          player: { select: { id: true, name: true, group: true } },
        },
        orderBy: { targetDate: 'asc' },
        take: 10,
      }),
    ]);

    // 为今日课程添加签到统计
    const enrichedSchedules = await Promise.all(
      todaySchedules.map(async (schedule) => {
        let planStats = null;
        if (schedule.planId) {
          const records = await prisma.trainingRecord.findMany({
            where: { planId: schedule.planId },
          });
          planStats = {
            total: records.length,
            present: records.filter((r) => r.attendance === 'present').length,
            absent: records.filter((r) => r.attendance === 'absent').length,
            late: records.filter((r) => r.attendance === 'late').length,
          };
        }
        return { ...schedule, applicableCourses: JSON.parse((schedule.applicableCourses as string) || '[]'), planStats };
      })
    );

    // 解析课时预警的 recordIds
    const parsedLowHours = lowHourEnrollments.map((e) => ({
      ...e,
      recordIds: JSON.parse((e.recordIds as string) || '[]'),
    }));

    // 计算今日出勤率
    const todayRecords = await prisma.trainingRecord.findMany({
      where: {
        createdAt: {
          gte: new Date(todayStr + 'T00:00:00'),
          lt: new Date(todayStr + 'T23:59:59'),
        },
      },
    });
    const attendanceRate =
      todayRecords.length > 0
        ? Math.round(
            (todayRecords.filter((r) => r.attendance === 'present').length /
              todayRecords.length) *
              100
          )
        : null;

    // 近7天训练次数
    const weekTrainingCount = recentRecords.length;

    return NextResponse.json({
      success: true,
      date: todayStr,
      dayOfWeek,
      dayName: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayOfWeek],
      todaySchedules: enrichedSchedules,
      lowHourEnrollments: parsedLowHours,
      recentPlans,
      recentRecords: recentRecords.map((r) => ({
        id: r.id,
        playerId: r.playerId,
        playerName: r.player?.name || '未知',
        playerGroup: r.player?.group || '',
        planId: r.planId,
        planTitle: r.plan?.title || '未知教案',
        attendance: r.attendance,
        performance: r.performance,
        feedback: r.feedback,
        createdAt: r.createdAt,
      })),
      stats: {
        totalPlayers,
        totalPlans,
        weekTrainingCount,
        attendanceRate,
        todayScheduleCount: enrichedSchedules.length,
        lowHourCount: lowHourEnrollments.length,
        activeGoalCount: activeGoals.length,
      },
      activeGoals: activeGoals.map((g) => ({
        id: g.id,
        playerId: g.playerId,
        playerName: g.player?.name || '未知',
        skillType: g.skillType,
        currentScore: g.currentScore,
        targetScore: g.targetScore,
        targetDate: g.targetDate,
        progress: Math.round((g.currentScore / g.targetScore) * 100),
      })),
    });
  } catch (error) {
    console.error('获取工作台数据失败:', error);
    return NextResponse.json({ success: false, error: '获取工作台数据失败' }, { status: 500 });
  }
}
