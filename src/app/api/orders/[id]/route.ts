import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/orders/[id] - 获取单个订单
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        player: { select: { id: true, name: true, parentPhone: true } },
        items: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('获取订单失败:', error);
    return NextResponse.json({ error: '获取订单失败' }, { status: 500 });
  }
}

// PUT /api/orders/[id] - 更新订单
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth(request, { roles: ['admin'] });
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { customerName, customerPhone, discountAmount, notes, validFrom, validUntil, status } =
      body;

    // 获取当前订单
    const currentOrder = await prisma.order.findUnique({ where: { id } });
    if (!currentOrder) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 更新订单
    const updateData: Record<string, unknown> = {};
    if (customerName !== undefined) updateData.customerName = customerName;
    if (customerPhone !== undefined) updateData.customerPhone = customerPhone;
    if (discountAmount !== undefined) {
      updateData.discountAmount = discountAmount;
      updateData.pendingAmount =
        currentOrder.totalAmount - discountAmount - currentOrder.paidAmount;
    }
    if (notes !== undefined) updateData.notes = notes;
    if (validFrom !== undefined) updateData.validFrom = new Date(validFrom);
    if (validUntil !== undefined) updateData.validUntil = new Date(validUntil);
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'cancelled') {
        updateData.cancelledAt = new Date();
      }
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        player: { select: { id: true, name: true } },
        items: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error('更新订单失败:', error);
    return NextResponse.json({ error: '更新订单失败' }, { status: 500 });
  }
}

// DELETE /api/orders/[id] - 删除订单（仅限未支付订单）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取当前订单
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 仅允许删除待支付订单
    if (order.status !== 'pending') {
      return NextResponse.json({ error: '仅可删除待支付订单' }, { status: 400 });
    }

    // 删除订单（级联删除items和payments）
    await prisma.order.delete({
      where: { id },
    });

    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除订单失败:', error);
    return NextResponse.json({ error: '删除订单失败' }, { status: 500 });
  }
}
