import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

interface OrderItemInput {
  itemType: string;
  itemId?: string;
  name: string;
  quantity?: number;
  unitPrice: number;
  subtotal: number;
  courseId?: string;
  hours?: number;
  validDays?: number;
  notes?: string;
}

// 生成订单号
function generateOrderNo(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD${dateStr}${random}`;
}

// GET /api/orders - 获取订单列表
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const playerId = searchParams.get('playerId');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status;
    if (playerId) where.playerId = playerId;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { orderNo: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        player: { select: { id: true, name: true } },
        items: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 计算统计数据
    const stats = {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      partiallyPaid: orders.filter((o) => o.status === 'partially_paid').length,
      paid: orders.filter((o) => o.status === 'paid').length,
      totalAmount: orders.reduce((sum, o) => sum + o.totalAmount, 0),
      paidAmount: orders.reduce((sum, o) => sum + o.paidAmount, 0),
      pendingAmount: orders.reduce((sum, o) => sum + o.pendingAmount, 0),
    };

    return NextResponse.json({ orders, stats });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    return NextResponse.json({ error: '获取订单列表失败' }, { status: 500 });
  }
}

// POST /api/orders - 创建订单
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, { roles: ['admin'] });
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const {
      type = 'course',
      playerId,
      customerName,
      customerPhone,
      items,
      discountAmount = 0,
      notes,
      validFrom,
      validUntil,
      paymentMethod,
      source = 'offline',
    } = body;

    // 计算订单金额
    const totalAmount =
      items.reduce((sum: number, item: OrderItemInput) => sum + item.subtotal, 0) - discountAmount;

    // 创建订单
    const order = await prisma.order.create({
      data: {
        orderNo: generateOrderNo(),
        type,
        playerId,
        customerName,
        customerPhone,
        totalAmount,
        discountAmount,
        paidAmount: 0,
        pendingAmount: totalAmount,
        status: 'pending',
        paymentMethod,
        source,
        notes,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        items: {
          create: items.map((item: OrderItemInput) => ({
            itemType: item.itemType,
            itemId: item.itemId,
            name: item.name,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            courseId: item.courseId,
            hours: item.hours,
            validDays: item.validDays,
            notes: item.notes,
          })),
        },
      },
      include: {
        player: { select: { id: true, name: true } },
        items: true,
      },
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error('创建订单失败:', error);
    return NextResponse.json({ error: '创建订单失败' }, { status: 500 });
  }
}
