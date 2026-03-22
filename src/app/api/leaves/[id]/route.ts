import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/leaves/[id] - 获取请假详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const leave = await prisma.leave.findUnique({ where: { id } })

    if (!leave) {
      return NextResponse.json({ success: false, error: '请假记录不存在' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      leave: {
        ...leave,
        dates: JSON.parse(leave.dates || '[]'),
        scheduleIds: JSON.parse(leave.scheduleIds || '[]')
      }
    })
  } catch (error) {
    console.error('获取请假详情失败:', error)
    return NextResponse.json({ success: false, error: '获取请假详情失败' }, { status: 500 })
  }
}

// PUT /api/leaves/[id] - 更新请假（审批）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.leave.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: '请假记录不存在' }, { status: 404 })
    }

    const { status, approverId, approverName, reply } = body

    const leave = await prisma.leave.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(approverId && { approverId }),
        ...(approverName && { approverName }),
        ...(reply !== undefined && { reply }),
        ...(status === 'approved' && { approvedAt: new Date() })
      }
    })

    return NextResponse.json({ success: true, leave })
  } catch (error) {
    console.error('更新请假失败:', error)
    return NextResponse.json({ success: false, error: '更新请假失败' }, { status: 500 })
  }
}

// DELETE /api/leaves/[id] - 删除请假
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.leave.delete({ where: { id } })

    return NextResponse.json({ success: true, message: '请假记录已删除' })
  } catch (error) {
    console.error('删除请假失败:', error)
    return NextResponse.json({ success: false, error: '删除请假失败' }, { status: 500 })
  }
}