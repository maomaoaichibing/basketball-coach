import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '@/lib/jwt';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phone } = body;

    // 验证必填字段
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, message: '邮箱、密码、姓名是必填项' },
        { status: 400 }
      );
    }

    // 密码长度检查
    if (password.length < 6) {
      return NextResponse.json({ success: false, message: '密码长度至少6位' }, { status: 400 });
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.coach.findFirst({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ success: false, message: '该邮箱已注册' }, { status: 400 });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const coach = await prisma.coach.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        role: 'coach', // 注册固定为普通教练，防止注册 admin
        status: 'active',
      },
    });

    // 生成 JWT token
    const token = jwt.sign({ id: coach.id, email: coach.email, role: coach.role }, JWT_CONFIG.secret, {
      expiresIn: JWT_CONFIG.expiresIn,
    });

    return NextResponse.json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: {
          id: coach.id,
          email: coach.email,
          name: coach.name,
          role: coach.role,
          phone: coach.phone,
          campusId: coach.campusId,
          status: coach.status,
        },
      },
    });
  } catch (error) {
    console.error('注册错误:', error);
    return NextResponse.json({ success: false, message: '服务器错误，请重试' }, { status: 500 });
  }
}
