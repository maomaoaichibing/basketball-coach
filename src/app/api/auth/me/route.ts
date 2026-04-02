import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'basketball-coach-secret-key-2024';

export async function GET(request: NextRequest) {
  try {
    // 从请求头获取 token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ success: false, message: '未登录或登录已过期' }, { status: 401 });
    }

    // 验证 token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
    };

    // 获取用户信息
    const coach = await prisma.coach.findUnique({
      where: { id: decoded.id },
      include: {
        campus: true,
      },
    });

    if (!coach) {
      return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });
    }

    if (coach.status !== 'active') {
      return NextResponse.json({ success: false, message: '账号已被禁用' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: coach.id,
        email: coach.email,
        name: coach.name,
        role: coach.role,
        phone: coach.phone,
        avatar: coach.avatar,
        campusId: coach.campusId,
        campusName: coach.campus?.name,
        status: coach.status,
        specialties: JSON.parse(coach.specialties || '[]'),
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ success: false, message: 'Token 无效' }, { status: 401 });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return NextResponse.json(
        { success: false, message: '登录已过期，请重新登录' },
        { status: 401 }
      );
    }

    console.error('获取用户信息错误:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
