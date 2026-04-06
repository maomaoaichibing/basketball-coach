import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// GET /api/teams/[id] - 获取单个球队详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        players: {
          include: {
            guardians: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ success: false, error: '球队不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      team,
    });
  } catch (error) {
    console.error('获取球队详情失败:', error);
    return NextResponse.json({ success: false, error: '获取球队详情失败' }, { status: 500 });
  }
}

// PUT /api/teams/[id] - 更新球队
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;
    const body = await request.json();

    const { name, group, coachName, coachPhone, location, trainingTime } = body;

    const team = await prisma.team.update({
      where: { id },
      data: {
        name,
        group,
        coachName,
        coachPhone,
        location,
        trainingTime,
      },
    });

    return NextResponse.json({
      success: true,
      team,
    });
  } catch (error) {
    console.error('更新球队失败:', error);
    return NextResponse.json({ success: false, error: '更新球队失败' }, { status: 500 });
  }
}

// DELETE /api/teams/[id] - 删除球队
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;

    // 检查是否有球员关联
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            players: true,
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ success: false, error: '球队不存在' }, { status: 404 });
    }

    if (team._count.players > 0) {
      return NextResponse.json(
        { success: false, error: '该球队还有球员，无法删除' },
        { status: 400 }
      );
    }

    await prisma.team.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '球队删除成功',
    });
  } catch (error) {
    console.error('删除球队失败:', error);
    return NextResponse.json({ success: false, error: '删除球队失败' }, { status: 500 });
  }
}
