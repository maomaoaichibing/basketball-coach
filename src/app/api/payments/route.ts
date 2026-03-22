import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/payments - 获取支付记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    const where: any = {}
    if (orderId) where.orderId = orderId

    const payments = await prisma.payment.findMany({
      where,
      include: {
        order: { select: { orderNo: true, customerName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ payments })
  } catch (error) {
    console.error('获取支付记录失败:', error)
    return NextResponse.json({ error: '获取支付记录失败' }, { status: 500 })
  }
}

// POST /api/payments - 创建支付记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      orderId,
      amount,
      paymentMethod,
      transactionNo,
      proofUrl,
      operator,
      operatorName,
      notes,
    } = body

    // 获取订单
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    })
    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    }

    // 创建支付记录
    const payment = await prisma.payment.create({
      data: {
        orderId,
        amount,
        paymentMethod,
        status: 'completed',
        paidAt: new Date(),
        transactionNo,
        proofUrl,
        operator,
        operatorName,
        notes,
      },
    })

    // 更新订单状态
    const newPaidAmount = order.paidAmount + amount
    const newPendingAmount = order.totalAmount - order.discountAmount - newPaidAmount

    let newStatus = order.status
    if (newPendingAmount <= 0) {
      newStatus = 'paid'
    } else if (newPaidAmount > 0) {
      newStatus = 'partially_paid'
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paidAmount: newPaidAmount,
        pendingAmount: Math.max(0, newPendingAmount),
        status: newStatus,
        paymentMethod, // 更新主要支付方式
      },
    })

    // 如果是课程购买订单且已支付，自动创建课时
    if (order.type === 'course' && newStatus === 'paid') {
      for (const item of order.items || []) {
        if (item.itemType === 'course' && item.courseId && item.hours) {
          // 创建或更新课时记录
          const existingEnrollment = await prisma.courseEnrollment.findFirst({
            where: {
              playerId: order.playerId!,
              courseId: item.courseId,
              status: 'active',
            },
          })

          if (existingEnrollment) {
            // 更新现有课时
            await prisma.courseEnrollment.update({
              where: { id: existingEnrollment.id },
              data: {
                totalHours: existingEnrollment.totalHours + item.hours,
                remainingHours: existingEnrollment.remainingHours + item.hours,
              },
            })
          } else {
            // 创建新课时记录
            await prisma.courseEnrollment.create({
              data: {
                playerId: order.playerId!,
                courseId: item.courseId,
                purchaseDate: new Date(),
                startDate: order.validFrom || new Date(),
                expireDate: order.validUntil || new Date(Date.now() + (item.validDays || 365) * 24 * 60 * 60 * 1000),
                totalHours: item.hours,
                usedHours: 0,
                remainingHours: item.hours,
                status: 'active',
                notes: `订单号: ${order.orderNo}`,
              },
            })
          }
        }
      }
    }

    return NextResponse.json({ payment })
  } catch (error) {
    console.error('创建支付记录失败:', error)
    return NextResponse.json({ error: '创建支付记录失败' }, { status: 500 })
  }
}