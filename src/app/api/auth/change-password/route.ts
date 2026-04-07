import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '@/lib/jwt';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_CONFIG.secret) as { id: string };

    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: '旧密码和新密码是必填项' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, message: '新密码长度至少6位' }, { status: 400 });
    }

    // 获取用户
    const coach = await prisma.coach.findUnique({ where: { id: decoded.id } });

    if (!coach || !coach.password) {
      return NextResponse.json(
        { success: false, message: '用户不存在或未设置密码' },
        { status: 404 }
      );
    }

    // 验证旧密码
    const isValid = await bcrypt.compare(oldPassword, coach.password);
    if (!isValid) {
      return NextResponse.json({ success: false, message: '旧密码不正确' }, { status: 400 });
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.coach.update({
      where: { id: decoded.id },
      data: { password: hashedPassword, mustChangePassword: false },
    });

    return NextResponse.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ success: false, message: 'Token 无效' }, { status: 401 });
    }
    console.error('修改密码错误:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
