import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  return NextResponse.json({
    success: true,
    data: auth.coach,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { name, phone, avatar } = body;

    // 动态构建更新字段
    const updateData: Record<string, string> = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (phone !== undefined) updateData.phone = String(phone).trim();
    if (avatar !== undefined) updateData.avatar = String(avatar).trim();

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: '没有需要更新的字段' },
        { status: 400 }
      );
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const updated = await prisma.coach.update({
      where: { id: auth.user.id },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, role: true, campusId: true },
    });

    return NextResponse.json({
      success: true,
      message: '资料更新成功',
      data: updated,
    });
  } catch (error) {
    console.error('更新资料错误:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
