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
      include: {
        records: {
          include: {
            player: {
              select: { id: true, name: true, group: true },
            },
          },
          orderBy: { signInTime: 'asc' },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ success: false, error: '教案不存在' }, { status: 404 });
    }

    // 解析 playerIds 为数组
    let parsedPlayerIds: string[] = [];
    try {
      parsedPlayerIds = JSON.parse(plan.playerIds || '[]');
    } catch {
      parsedPlayerIds = [];
    }

    // 如果有 playerIds 但没有关联的 records（兼容旧数据），补充查询学员信息
    let playerDetails: { id: string; name: string; group: string }[] = [];
    if (parsedPlayerIds.length > 0) {
      const players = await prisma.player.findMany({
        where: { id: { in: parsedPlayerIds } },
        select: { id: true, name: true, group: true },
      });
      playerDetails = parsedPlayerIds
        .map(id => players.find(p => p.id === id))
        .filter((p): p is { id: string; name: string; group: string } => !!p);
    }

    return NextResponse.json({
      success: true,
      plan,
      playerDetails,
      records: plan.records,
    });
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
