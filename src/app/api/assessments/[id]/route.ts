import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// GET /api/assessments/[id] - 获取评估详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;

    const assessment = await prisma.playerAssessment.findUnique({
      where: { id },
      include: {
        player: { select: { id: true, name: true } },
      },
    });

    if (!assessment) {
      return NextResponse.json({ success: false, error: '评估记录不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      assessment,
    });
  } catch (error) {
    console.error('获取评估详情失败:', error);
    return NextResponse.json({ success: false, error: '获取评估详情失败' }, { status: 500 });
  }
}

// PUT /api/assessments/[id] - 更新评估记录
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;
    const body = await request.json();

    const {
      dribbling,
      passing,
      shooting,
      defending,
      physical,
      tactical,
      overall,
      notes,
      assessor,
    } = body;

    // 检查是否存在
    const existing = await prisma.playerAssessment.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: '评估记录不存在' }, { status: 404 });
    }

    const assessment = await prisma.playerAssessment.update({
      where: { id },
      data: {
        dribbling,
        passing,
        shooting,
        defending,
        physical,
        tactical,
        overall,
        notes,
        assessor,
      },
    });

    return NextResponse.json({
      success: true,
      assessment,
    });
  } catch (error) {
    console.error('更新评估失败:', error);
    return NextResponse.json({ success: false, error: '更新评估失败' }, { status: 500 });
  }
}

// DELETE /api/assessments/[id] - 删除评估记录
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;

    // 检查是否存在
    const existing = await prisma.playerAssessment.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: '评估记录不存在' }, { status: 404 });
    }

    await prisma.playerAssessment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '评估记录已删除',
    });
  } catch (error) {
    console.error('删除评估失败:', error);
    return NextResponse.json({ success: false, error: '删除评估失败' }, { status: 500 });
  }
}
