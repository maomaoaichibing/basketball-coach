import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/stats - 获取综合统计数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // day, week, month, year

    // 计算日期范围
    const now = new Date()
    let startDate: Date
    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0))
        break
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7))
        break
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1))
        break
      case 'month':
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1))
    }

    // 1. 学员统计
    const totalPlayers = await prisma.player.count()
    const activePlayers = await prisma.player.count({ where: { status: 'training' } })
    const trialPlayers = await prisma.player.count({ where: { status: 'trial' } })

    // 新增学员（指定周期内）
    const newPlayersThisPeriod = await prisma.player.count({
      where: {
        createdAt: { gte: startDate },
      },
    })

    // 2. 收入统计
    const payments = await prisma.payment.findMany({
      where: {
        status: 'completed',
        paidAt: { gte: startDate },
      },
    })
    const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0)

    // 本月收入
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const monthPayments = await prisma.payment.findMany({
      where: {
        status: 'completed',
        paidAt: { gte: monthStart },
      },
    })
    const monthIncome = monthPayments.reduce((sum, p) => sum + p.amount, 0)

    // 3. 订单统计
    const totalOrders = await prisma.order.count()
    const pendingOrders = await prisma.order.count({ where: { status: 'pending' } })
    const paidOrders = await prisma.order.count({ where: { status: 'paid' } })

    const ordersThisPeriod = await prisma.order.count({
      where: { createdAt: { gte: startDate } },
    })

    // 4. 训练统计
    const totalRecords = await prisma.trainingRecord.count()
    const recordsThisPeriod = await prisma.trainingRecord.count({
      where: {
        recordedAt: { gte: startDate },
      },
    })

    // 出勤率
    const recentRecords = await prisma.trainingRecord.findMany({
      where: {
        recordedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { attendance: true },
    })
    const attendanceRate = recentRecords.length > 0
      ? (recentRecords.filter(r => r.attendance === 'present').length / recentRecords.length * 100).toFixed(1)
      : 0

    // 5. 课时消耗统计
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { status: 'active' },
    })
    const totalHoursRemaining = enrollments.reduce((sum, e) => sum + e.remainingHours, 0)
    const totalHoursUsed = enrollments.reduce((sum, e) => sum + e.usedHours, 0)

    // 6. 按分组统计学员
    const playersByGroup = await prisma.player.groupBy({
      by: ['group'],
      _count: true,
    })

    // 7. 收入趋势（最近7天）
    const incomeTrend: { date: string; amount: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dayStart = new Date(date.setHours(0, 0, 0, 0))
      const dayEnd = new Date(date.setHours(23, 59, 59, 999))

      const dayPayments = await prisma.payment.aggregate({
        where: {
          status: 'completed',
          paidAt: { gte: dayStart, lte: dayEnd },
        },
        _sum: { amount: true },
      })

      incomeTrend.push({
        date: dayStart.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        amount: dayPayments._sum.amount || 0,
      })
    }

    // 8. 课程销售排行
    const courseSales = await prisma.orderItem.groupBy({
      by: ['name'],
      _count: true,
      _sum: { subtotal: true },
      orderBy: { _count: { name: 'desc' } },
      take: 5,
    })

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
        attendanceRate: parseFloat(attendanceRate as string),
        totalHoursRemaining,
        totalHoursUsed,
      },
      playersByGroup,
      incomeTrend,
      courseSales,
    })
  } catch (error) {
    console.error('获取统计数据失败:', error)
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 })
  }
}