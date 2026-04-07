import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// 获取案例详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const caseItem = await prisma.trainingCase.findUnique({
      where: { id: params.id },
    });

    if (!caseItem) {
      return NextResponse.json({ success: false, error: '案例不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, case: caseItem });
  } catch (error) {
    console.error('获取案例详情失败:', error);
    return NextResponse.json({ success: false, error: '获取案例详情失败' }, { status: 500 });
  }
}

// 更新案例
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();

    // 处理 JSON 字段
    const updateData: Record<string, unknown> = { ...body };
    if (body.equipment) updateData.equipment = JSON.stringify(body.equipment);
    if (body.tags) updateData.tags = JSON.stringify(body.tags);

    const caseItem = await prisma.trainingCase.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, case: caseItem });
  } catch (error) {
    console.error('更新案例失败:', error);
    return NextResponse.json({ success: false, error: '更新案例失败' }, { status: 500 });
  }
}

// 部分更新案例（收藏等）
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { isFavorite, title, content, category, techType, ageGroup } = body;

    const updateData: Record<string, unknown> = {};
    if (typeof isFavorite === 'boolean') updateData.isFavorite = isFavorite;
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (category) updateData.category = category;
    if (techType) updateData.techType = techType;
    if (ageGroup) updateData.ageGroup = ageGroup;

    const caseItem = await prisma.trainingCase.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, case: caseItem });
  } catch (error) {
    console.error('更新案例失败:', error);
    return NextResponse.json({ success: false, error: '更新案例失败' }, { status: 500 });
  }
}

// 删除案例
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    await prisma.trainingCase.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除案例失败:', error);
    return NextResponse.json({ success: false, error: '删除案例失败' }, { status: 500 });
  }
}
