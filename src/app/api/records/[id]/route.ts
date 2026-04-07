import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// GET /api/records/[id] - 获取训练记录详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;

    const record = await prisma.trainingRecord.findUnique({
      where: { id },
      include: {
        player: { select: { id: true, name: true } },
        plan: { select: { id: true, title: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ success: false, error: '训练记录不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      record,
    });
  } catch (error) {
    console.error('获取训练记录详情失败:', error);
    return NextResponse.json({ success: false, error: '获取训练记录详情失败' }, { status: 500 });
  }
}

// PUT /api/records/[id] - 更新训练记录
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;
    const body = await request.json();

    const {
      playerId,
      planId,
      attendance,
      signInTime,
      signOutTime,
      performance,
      effort,
      attitude,
      feedback,
      highlights,
      issues,
      improvements,
      skillScores,
    } = body;

    // 检查是否存在
    const existing = await prisma.trainingRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: '训练记录不存在' }, { status: 404 });
    }

    const record = await prisma.trainingRecord.update({
      where: { id },
      data: {
        playerId,
        planId,
        attendance,
        signInTime: signInTime ? new Date(signInTime) : undefined,
        signOutTime: signOutTime ? new Date(signOutTime) : undefined,
        performance,
        effort,
        attitude,
        feedback,
        highlights,
        issues,
        improvements,
        skillScores,
      },
    });

    return NextResponse.json({
      success: true,
      record,
    });
  } catch (error) {
    console.error('更新训练记录失败:', error);
    return NextResponse.json({ success: false, error: '更新训练记录失败' }, { status: 500 });
  }
}

// PATCH /api/records/[id] - 部分更新训练记录（签到/反馈）
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;
    const body = await request.json();

    const existing = await prisma.trainingRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: '训练记录不存在' }, { status: 404 });
    }

    const record = await prisma.trainingRecord.update({
      where: { id },
      data: {
        attendance: body.attendance ?? undefined,
        performance: body.performance ?? undefined,
        effort: body.effort ?? undefined,
        attitude: body.attitude ?? undefined,
        feedback: body.feedback ?? undefined,
        highlights: body.highlights ?? undefined,
        issues: body.issues ?? undefined,
        improvements: body.improvements ?? undefined,
        skillScores: body.skillScores ? JSON.stringify(body.skillScores) : undefined,
        signOutTime: body.signOutTime ? new Date(body.signOutTime) : undefined,
      },
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error('更新训练记录失败:', error);
    return NextResponse.json({ success: false, error: '更新训练记录失败' }, { status: 500 });
  }
}

// DELETE /api/records/[id] - 删除训练记录
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;

    // 检查是否存在
    const existing = await prisma.trainingRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: '训练记录不存在' }, { status: 404 });
    }

    await prisma.trainingRecord.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '训练记录已删除',
    });
  } catch (error) {
    console.error('删除训练记录失败:', error);
    return NextResponse.json({ success: false, error: '删除训练记录失败' }, { status: 500 });
  }
}
