import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// GET 获取推荐详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;
    const recommend = await prisma.trainingRecommend.findUnique({
      where: { id },
    });

    if (!recommend) {
      return NextResponse.json({ error: '推荐不存在' }, { status: 404 });
    }

    return NextResponse.json(recommend);
  } catch (error) {
    console.error('获取推荐详情失败:', error);
    return NextResponse.json({ error: '获取推荐详情失败' }, { status: 500 });
  }
}

// PUT 更新推荐状态
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;
    const body = await request.json();
    const { status, feedback, effectiveness } = body;

    const recommend = await prisma.trainingRecommend.update({
      where: { id },
      data: {
        status: status || undefined,
        feedback,
        effectiveness,
      },
    });

    return NextResponse.json(recommend);
  } catch (error) {
    console.error('更新推荐失败:', error);
    return NextResponse.json({ error: '更新推荐失败' }, { status: 500 });
  }
}

// DELETE 删除推荐
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;
    await prisma.trainingRecommend.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除推荐失败:', error);
    return NextResponse.json({ error: '删除推荐失败' }, { status: 500 });
  }
}
