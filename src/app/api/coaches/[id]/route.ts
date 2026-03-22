import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/coaches/[id] - 获取教练详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const coach = await prisma.coach.findUnique({
      where: { id },
      include: {
        campus: { select: { id: true, name: true } }
      }
    })

    if (!coach) {
      return NextResponse.json(
        { success: false, error: '教练不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      coach
    })
  } catch (error) {
    console.error('获取教练详情失败:', error)
    return NextResponse.json(
      { success: false, error: '获取教练详情失败' },
      { status: 500 }
    )
  }
}

// PUT /api/coaches/[id] - 更新教练信息
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const {
      name,
      phone,
      email,
      campusId,
      specialties,
      status,
      hireDate,
      notes
    } = body

    // 检查是否存在
    const existing = await prisma.coach.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '教练不存在' },
        { status: 404 }
      )
    }

    const coach = await prisma.coach.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        campusId,
        specialties,
        status,
        hireDate: hireDate ? new Date(hireDate) : undefined,
        notes
      }
    })

    return NextResponse.json({
      success: true,
      coach
    })
  } catch (error) {
    console.error('更新教练失败:', error)
    return NextResponse.json(
      { success: false, error: '更新教练失败' },
      { status: 500 }
    )
  }
}

// DELETE /api/coaches/[id] - 删除教练
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // 检查是否存在
    const existing = await prisma.coach.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '教练不存在' },
        { status: 404 }
      )
    }

    await prisma.coach.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: '教练已删除'
    })
  } catch (error) {
    console.error('删除教练失败:', error)
    return NextResponse.json(
      { success: false, error: '删除教练失败' },
      { status: 500 }
    )
  }
}