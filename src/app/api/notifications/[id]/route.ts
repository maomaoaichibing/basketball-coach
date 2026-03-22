import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/notifications/[id] - 获取单个通知
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const notification = await prisma.notification.findUnique({
      where: { id },
      include: {
        player: { select: { id: true, name: true } },
        template: true,
      },
    })

    if (!notification) {
      return NextResponse.json({ error: '通知不存在' }, { status: 404 })
    }

    return NextResponse.json({ notification })
  } catch (error) {
    console.error('获取通知失败:', error)
    return NextResponse.json({ error: '获取通知失败' }, { status: 500 })
  }
}

// PUT /api/notifications/[id] - 更新通知状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    const updateData: Record<string, unknown> = {}
    if (status) {
      updateData.status = status
      if (status === 'read') {
        updateData.readAt = new Date()
      }
      if (status === 'sent') {
        updateData.sentAt = new Date()
      }
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: updateData,
      include: {
        player: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ notification })
  } catch (error) {
    console.error('更新通知失败:', error)
    return NextResponse.json({ error: '更新通知失败' }, { status: 500 })
  }
}

// DELETE /api/notifications/[id] - 删除通知
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.notification.delete({ where: { id } })
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除通知失败:', error)
    return NextResponse.json({ error: '删除通知失败' }, { status: 500 })
  }
}