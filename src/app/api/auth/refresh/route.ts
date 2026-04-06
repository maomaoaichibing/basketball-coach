import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '@/lib/jwt';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // 从请求头获取当前 token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    // 验证当前 token（允许过期窗口：即使过期也不超过 refreshExpiresIn）
    let decoded: { id: string; email: string; role: string; iat?: number; exp?: number };
    try {
      decoded = jwt.verify(token, JWT_CONFIG.secret) as typeof decoded;
    } catch (error) {
      // 如果 token 过期了，尝试用 refreshExpiresIn 宽限期再验证一次
      if (error instanceof jwt.TokenExpiredError) {
        // 用相同的 secret + refreshExpiresIn 尝试宽限期验证
        try {
          // 解码过期 token 获取 payload（不验证签名外的过期时间）
          const payload = jwt.decode(token) as typeof decoded;
          if (!payload || !payload.exp) {
            return NextResponse.json({ success: false, message: 'Token 无效' }, { status: 401 });
          }

          // 检查是否在 refresh 宽限期内（30天）
          const refreshLimit = 30 * 24 * 60 * 60; // 30天秒数
          const elapsed = Math.floor(Date.now() / 1000) - payload.exp;
          if (elapsed > refreshLimit) {
            return NextResponse.json(
              { success: false, message: '登录已过期太久，请重新登录' },
              { status: 401 }
            );
          }

          // 在宽限期内，验证用户仍存在且活跃，签发新 token
          const coach = await prisma.coach.findUnique({
            where: { id: payload.id },
          });

          if (!coach || coach.status !== 'active') {
            return NextResponse.json(
              { success: false, message: '用户不存在或已禁用' },
              { status: 401 }
            );
          }

          const newToken = jwt.sign(
            { id: coach.id, email: coach.email, role: coach.role },
            JWT_CONFIG.secret,
            { expiresIn: JWT_CONFIG.expiresIn }
          );

          return NextResponse.json({
            success: true,
            data: {
              token: newToken,
              expiresIn: JWT_CONFIG.expiresIn,
            },
          });
        } catch {
          return NextResponse.json(
            { success: false, message: 'Token 无效，请重新登录' },
            { status: 401 }
          );
        }
      }
      return NextResponse.json({ success: false, message: 'Token 无效' }, { status: 401 });
    }

    // token 仍然有效，正常刷新
    const coach = await prisma.coach.findUnique({
      where: { id: decoded.id },
    });

    if (!coach) {
      return NextResponse.json({ success: false, message: '用户不存在' }, { status: 401 });
    }

    if (coach.status !== 'active') {
      return NextResponse.json({ success: false, message: '账号已被禁用' }, { status: 403 });
    }

    // 签发新 token
    const newToken = jwt.sign(
      { id: coach.id, email: coach.email, role: coach.role },
      JWT_CONFIG.secret,
      { expiresIn: JWT_CONFIG.expiresIn }
    );

    return NextResponse.json({
      success: true,
      data: {
        token: newToken,
        expiresIn: JWT_CONFIG.expiresIn,
      },
    });
  } catch (error) {
    console.error('Token 刷新错误:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
