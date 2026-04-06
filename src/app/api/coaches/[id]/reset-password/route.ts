import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

// POST /api/coaches/[id]/reset-password - 重置教练密码（仅管理员）
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, { roles: ['admin'] });
  if (!auth.success) return auth.response;

  try {
    const { id } = params;
    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: '新密码长度至少6位' },
        { status: 400 }
      );
    }

    // 检查教练是否存在
    const coach = await prisma.coach.findUnique({ where: { id } });
    if (!coach) {
      return NextResponse.json(
        { success: false, message: '教练不存在' },
        { status: 404 }
      );
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.coach.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: '密码重置成功',
    });
  } catch (error) {
    console.error('重置密码失败:', error);
    return NextResponse.json(
      { success: false, message: '重置密码失败' },
      { status: 500 }
    );
  }
}
