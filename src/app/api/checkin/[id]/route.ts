import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/db';

// GET /api/checkin/[id] - 获取签到详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const checkin = await prisma.checkIn.findUnique({
      where: { id },
    });

    if (!checkin) {
      return NextResponse.json({ success: false, error: '签到记录不存在' }, { status: 404 });
    }

    // 获取点赞数
    const likeCount = await prisma.checkInLike.count({
      where: { checkInId: id },
    });

    return NextResponse.json({
      success: true,
      checkin: { ...checkin, likeCount },
    });
  } catch (error) {
    console.error('获取签到详情失败:', error);
    return NextResponse.json({ success: false, error: '获取签到详情失败' }, { status: 500 });
  }
}

// PUT /api/checkin/[id] - 更新签到记录（教练点评）
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();

    const { type, content, coachId, coachName, coachComment } = body;

    // 检查是否存在
    const existing = await prisma.checkIn.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: '签到记录不存在' }, { status: 404 });
    }

    const checkin = await prisma.checkIn.update({
      where: { id },
      data: {
        checkInType: type,
        content,
        coachId,
        coachName,
        coachFeedback: coachComment,
        feedbackAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      checkin,
    });
  } catch (error) {
    console.error('更新签到失败:', error);
    return NextResponse.json({ success: false, error: '更新签到失败' }, { status: 500 });
  }
}

// DELETE /api/checkin/[id] - 删除签到记录
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // 检查是否存在
    const existing = await prisma.checkIn.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: '签到记录不存在' }, { status: 404 });
    }

    await prisma.checkIn.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '签到记录已删除',
    });
  } catch (error) {
    console.error('删除签到失败:', error);
    return NextResponse.json({ success: false, error: '删除签到失败' }, { status: 500 });
  }
}
