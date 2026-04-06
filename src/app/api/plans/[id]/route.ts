import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// 获取教案详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const plan = await prisma.trainingPlan.findUnique({
      where: { id: params.id },
    });

    if (!plan) {
      return NextResponse.json({ success: false, error: '教案不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error('获取教案详情失败:', error);
    return NextResponse.json({ success: false, error: '获取教案详情失败' }, { status: 500 });
  }
}

// 更新教案
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();

    const plan = await prisma.trainingPlan.update({
      where: { id: params.id },
      data: body,
    });

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error('更新教案失败:', error);
    return NextResponse.json({ success: false, error: '更新教案失败' }, { status: 500 });
  }
}

// 删除教案
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    await prisma.trainingPlan.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除教案失败:', error);
    return NextResponse.json({ success: false, error: '删除教案失败' }, { status: 500 });
  }
}
