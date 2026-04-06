// API 鉴权中间件
// 在需要鉴权的 API 路由中调用此函数，验证请求中的 JWT token

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from './jwt';
import prisma from '@/lib/db';

export interface AuthPayload {
  id: string;
  email: string;
  role: string;
}

export interface AuthResult {
  success: true;
  user: AuthPayload;
  coach: {
    id: string;
    email: string | null;
    name: string;
    role: string | null;
    phone: string;
    campusId: string | null;
    status: string;
  };
}

export type AuthCheckResult = AuthResult | { success: false; response: NextResponse };

/**
 * 验证请求中的 JWT token
 * @param request NextRequest 对象
 * @param options.roles 可选的角色限制，如 ['admin']
 * @returns 验证结果
 *
 * 使用示例：
 * ```
 * const auth = await verifyAuth(request);
 * if (!auth.success) return auth.response;
 * // auth.user.id, auth.user.email, auth.user.role 可用
 * ```
 */
export async function verifyAuth(
  request: NextRequest,
  options?: { roles?: string[] }
): Promise<AuthCheckResult> {
  // 1. 获取 token
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: '未登录或登录已过期' },
        { status: 401 }
      ),
    };
  }

  // 2. 验证 token
  let decoded: AuthPayload;
  try {
    decoded = jwt.verify(token, JWT_CONFIG.secret) as AuthPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, message: '登录已过期，请重新登录' },
          { status: 401 }
        ),
      };
    }
    return {
      success: false,
      response: NextResponse.json({ success: false, message: 'Token 无效' }, { status: 401 }),
    };
  }

  // 3. 查询用户
  const coach = await prisma.coach.findUnique({
    where: { id: decoded.id },
  });

  if (!coach) {
    return {
      success: false,
      response: NextResponse.json({ success: false, message: '用户不存在' }, { status: 401 }),
    };
  }

  if (coach.status !== 'active') {
    return {
      success: false,
      response: NextResponse.json({ success: false, message: '账号已被禁用' }, { status: 403 }),
    };
  }

  // 4. 角色检查
  if (options?.roles && options.roles.length > 0) {
    if (!coach.role || !options.roles.includes(coach.role)) {
      return {
        success: false,
        response: NextResponse.json({ success: false, message: '权限不足' }, { status: 403 }),
      };
    }
  }

  return {
    success: true,
    user: decoded,
    coach: {
      id: coach.id,
      email: coach.email,
      name: coach.name,
      role: coach.role,
      phone: coach.phone ?? '',
      campusId: coach.campusId,
      status: coach.status,
    },
  };
}
