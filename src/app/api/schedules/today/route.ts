import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/schedules/today - 获取今日课程（含教案和签到状态）
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    // 获取今天是星期几 (0=周日, 1=周一, ..., 6=周六)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0-6

    // 查询今天的所有活跃排课
    const schedules = await prisma.schedule.findMany({
      where: {
        dayOfWeek,
        status: 'active',
      },
      include: {
        team: { select: { id: true, name: true } },
        plan: {
          select: {
            id: true,
            title: true,
            date: true,
            group: true,
            theme: true,
            status: true,
            duration: true,
          },
        },
      },
      orderBy: [{ startTime: 'asc' }],
    });

    // 对每个排课，获取签到统计
    const todayStr = today.toISOString().slice(0, 10);
    const enrichedSchedules = await Promise.all(
      schedules.map(async (schedule) => {
        let planStats = null;

        if (schedule.planId) {
          // 获取该教案的所有训练记录签到统计
          const records = await prisma.trainingRecord.findMany({
            where: { planId: schedule.planId },
            include: {
              player: { select: { id: true, name: true, group: true } },
            },
          });

          const present = records.filter((r) => r.attendance === 'present').length;
          const absent = records.filter((r) => r.attendance === 'absent').length;
          const late = records.filter((r) => r.attendance === 'late').length;
          const total = records.length;

          planStats = {
            total,
            present,
            absent,
            late,
            records: records.map((r) => ({
              id: r.id,
              playerId: r.playerId,
              playerName: r.player?.name || '未知',
              attendance: r.attendance,
              performance: r.performance,
              feedback: r.feedback,
              signInTime: r.signInTime,
            })),
          };
        }

        // 获取该排课的预约数
        const bookingCount = await prisma.booking.count({
          where: {
            scheduleId: schedule.id,
            status: 'confirmed',
            bookingDate: {
              gte: new Date(todayStr + 'T00:00:00'),
              lt: new Date(todayStr + 'T23:59:59'),
            },
          },
        });

        return {
          ...schedule,
          applicableCourses: JSON.parse((schedule.applicableCourses as string) || '[]'),
          bookingCount,
          planStats,
        };
      })
    );

    return NextResponse.json({
      success: true,
      date: todayStr,
      dayOfWeek,
      dayName: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayOfWeek],
      schedules: enrichedSchedules,
      total: enrichedSchedules.length,
    });
  } catch (error) {
    console.error('获取今日课程失败:', error);
    return NextResponse.json({ success: false, error: '获取今日课程失败' }, { status: 500 });
  }
}
