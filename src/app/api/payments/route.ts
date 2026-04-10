import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-middleware';

const prisma = new PrismaClient();

// GET /api/payments - 获取支付记录列表
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {};
    if (orderId) where.orderId = orderId;
    if (status) where.status = status;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNo: true,
              customerName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      payments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('获取支付记录失败:', error);
    return NextResponse.json({ error: '获取支付记录失败' }, { status: 500 });
  }
}

// POST /api/payments - 创建支付记录
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { orderId, amount, paymentMethod, transactionNo, operatorName, notes } = body;

    if (!orderId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: '缺少必要参数：orderId, amount, paymentMethod' },
        { status: 400 }
      );
    }

    // 查找关联订单
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 创建支付记录
    const payment = await prisma.payment.create({
      data: {
        orderId,
        amount: parseFloat(String(amount)),
        paymentMethod,
        transactionNo: transactionNo || null,
        operatorName: operatorName || null,
        notes: notes || null,
        status: 'completed',
        paidAt: new Date(),
      },
    });

    const newPaidAmount = order.paidAmount + parseFloat(String(amount));
    const newPendingAmount = Math.max(0, order.totalAmount - newPaidAmount - order.discountAmount);

    let newStatus = order.status;
    if (newPaidAmount >= order.totalAmount - order.discountAmount) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partially_paid';
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paidAmount: newPaidAmount,
        pendingAmount: newPendingAmount,
        status: newStatus,
      },
    });

    // 如果是课程订单，更新课程购买记录的课时
    if (order.type === 'course' && order.playerId) {
      const items = await prisma.orderItem.findMany({
        where: { orderId },
      });

      for (const item of items) {
        if (item.courseId && item.hours) {
          const course = await prisma.course.findUnique({ where: { id: item.courseId } });
          const validDays = item.validDays || course?.validDays || 365;

          // 查找该学员是否有该课程的购买记录
          const enrollment = await prisma.courseEnrollment.findFirst({
            where: {
              playerId: order.playerId,
              courseId: item.courseId,
              status: 'active',
            },
          });

          if (enrollment) {
            // 更新现有记录
            await prisma.courseEnrollment.update({
              where: { id: enrollment.id },
              data: {
                totalHours: enrollment.totalHours + item.hours,
                remainingHours: enrollment.remainingHours + item.hours,
              },
            });
          } else {
            // 创建新的购买记录
            await prisma.courseEnrollment.create({
              data: {
                playerId: order.playerId,
                courseId: item.courseId,
                purchaseDate: new Date(),
                startDate: new Date(),
                expireDate: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000),
                totalHours: item.hours,
                remainingHours: item.hours,
                status: 'active',
              },
            });
          }
        }
      }
    }

    return NextResponse.json({ payment, orderStatus: newStatus }, { status: 201 });
  } catch (error) {
    console.error('创建支付记录失败:', error);
    return NextResponse.json({ error: '创建支付记录失败' }, { status: 500 });
  }
}
