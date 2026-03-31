import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

// JWT Secret - 生产环境应从环境变量读取
const JWT_SECRET = process.env.JWT_SECRET || 'basketball-coach-secret-key-2024'
const JWT_EXPIRES_IN = '7d'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // 验证必填字段
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: '邮箱和密码是必填项' },
        { status: 400 }
      )
    }

    // 查找用户（使用 findFirst 因为 email 可能不是唯一索引）
    const coach = await prisma.coach.findFirst({
      where: { email }
    })

    if (!coach) {
      return NextResponse.json(
        { success: false, message: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    // 验证密码（处理password可能为null的情况）
    if (!coach.password) {
      return NextResponse.json(
        { success: false, message: '账号未设置密码，请联系管理员' },
        { status: 401 }
      )
    }

    const isValidPassword = await bcrypt.compare(password, coach.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    // 检查用户状态
    if (coach.status !== 'active') {
      return NextResponse.json(
        { success: false, message: '账号已被禁用，请联系管理员' },
        { status: 403 }
      )
    }

    // 生成 JWT
    const token = jwt.sign(
      {
        id: coach.id,
        email: coach.email,
        role: coach.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    // 返回用户信息和 token
    return NextResponse.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: coach.id,
          email: coach.email,
          name: coach.name,
          role: coach.role,
          phone: coach.phone,
          campusId: coach.campusId,
          status: coach.status
        }
      }
    })
  } catch (error) {
    console.error('登录错误:', error)
    return NextResponse.json(
      { success: false, message: '服务器错误，请重试' },
      { status: 500 }
    )
  }
}