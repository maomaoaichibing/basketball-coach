import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/stats - 获取综合统计数据
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // day, week, month, year

    // 计算日期范围（修正：不修改 now 原始值）
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }

    // 本月起始日期
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    // 30天前（出勤率）
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // 7天前（收入趋势）
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 所有统计查询并行执行（原来串行 ~15 次查询 → 并行 8 组）
    const [
      // 1. 学员统计
      playerCounts,
      // 2. 收入统计（aggregate 比 findMany+reduce 快得多）
      periodIncome,
      monthIncomeData,
      // 3. 订单统计
      orderCounts,
      // 4. 训练统计
      recordCounts,
      // 出勤率（groupBy 比 findMany+filter 快）
      attendanceStats,
      // 5. 课时消耗
      enrollmentStats,
      // 6. 按分组统计
      playersByGroup,
      // 7. 收入趋势（单次查询7天数据）
      weekPayments,
      // 8. 课程销售排行
      courseSales,
    ] = await Promise.all([
      // 学员统计（单次查询4种 count 用 Promise.all 太碎，这里用一个技巧）
      Promise.all([
        prisma.player.count(),
        prisma.player.count({ where: { status: 'training' } }),
        prisma.player.count({ where: { status: 'trial' } }),
        prisma.player.count({ where: { createdAt: { gte: startDate } } }),
      ]),
      // 收入统计 - 用 aggregate._sum 替代 findMany + reduce
      prisma.payment.aggregate({
        where: { status: 'completed', paidAt: { gte: startDate } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'completed', paidAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      // 订单统计
      Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { status: 'pending' } }),
        prisma.order.count({ where: { status: 'paid' } }),
        prisma.order.count({ where: { createdAt: { gte: startDate } } }),
      ]),
      // 训练统计
      Promise.all([
        prisma.trainingRecord.count(),
        prisma.trainingRecord.count({ where: { recordedAt: { gte: startDate } } }),
      ]),
      // 出勤率 - groupBy 比 findMany + JS filter 更高效
      prisma.trainingRecord.groupBy({
        by: ['attendance'],
        where: { recordedAt: { gte: thirtyDaysAgo } },
        _count: true,
      }),
      // 课时消耗
      prisma.courseEnrollment.aggregate({
        where: { status: 'active' },
        _sum: { remainingHours: true, usedHours: true },
      }),
      // 分组统计
      prisma.player.groupBy({ by: ['group'], _count: true }),
      // 收入趋势 - 一次查询所有7天数据，JS端分组（原来7次串行查询）
      prisma.payment.findMany({
        where: {
          status: 'completed',
          paidAt: { gte: sevenDaysAgo },
        },
        select: { paidAt: true, amount: true },
      }),
      // 课程销售排行
      prisma.orderItem.groupBy({
        by: ['name'],
        _count: true,
        _sum: { subtotal: true },
        orderBy: { _count: { name: 'desc' } },
        take: 5,
      }),
    ]);

    // 解构并行结果
    const [totalPlayers, activePlayers, trialPlayers, newPlayersThisPeriod] = playerCounts;
    const totalIncome = (periodIncome._sum.amount as number) || 0;
    const monthIncome = (monthIncomeData._sum.amount as number) || 0;
    const [totalOrders, pendingOrders, paidOrders, ordersThisPeriod] = orderCounts;
    const [totalRecords, recordsThisPeriod] = recordCounts;

    // 计算出勤率
    const totalAttendance = attendanceStats.reduce((sum, s) => sum + s._count, 0);
    const presentCount = attendanceStats.find((s) => s.attendance === 'present')?._count || 0;
    const attendanceRate =
      totalAttendance > 0 ? parseFloat(((presentCount / totalAttendance) * 100).toFixed(1)) : 0;

    // 课时消耗
    const totalHoursRemaining = (enrollmentStats._sum.remainingHours as number) || 0;
    const totalHoursUsed = (enrollmentStats._sum.usedHours as number) || 0;

    // 收入趋势 - 内存分组（7次查询 → 1次查询 + JS分组）
    const incomeByDay = new Map<string, number>();
    for (const p of weekPayments) {
      if (!p.paidAt) continue;
      const dayKey = p.paidAt.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      incomeByDay.set(dayKey, (incomeByDay.get(dayKey) || 0) + p.amount);
    }
    const incomeTrend: { date: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      incomeTrend.push({
        date: dateStr,
        amount: incomeByDay.get(dateStr) || 0,
      });
    }

    return NextResponse.json({
      period,
      overview: {
        totalPlayers,
        activePlayers,
        trialPlayers,
        newPlayersThisPeriod,
        totalIncome,
        monthIncome,
        totalOrders,
        pendingOrders,
        paidOrders,
        ordersThisPeriod,
        totalRecords,
        recordsThisPeriod,
        attendanceRate,
        totalHoursRemaining,
        totalHoursUsed,
      },
      playersByGroup,
      incomeTrend,
      courseSales,
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
