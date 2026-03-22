import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// 获取目标详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const goal = await prisma.playerGoal.findUnique({
      where: { id: params.id },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            group: true
          }
        }
      }
    })

    if (!goal) {
      return NextResponse.json(
        { success: false, error: '目标不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, goal })
  } catch (error) {
    console.error('获取目标详情失败:', error)
    return NextResponse.json(
      { success: false, error: '获取目标详情失败' },
      { status: 500 }
    )
  }
}

// 更新目标
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { targetScore, currentScore, status, targetDate } = body

    const updateData: Record<string, unknown> = {}
    if (targetScore !== undefined) updateData.targetScore = parseInt(targetScore)
    if (currentScore !== undefined) updateData.currentScore = parseInt(currentScore)
    if (status !== undefined) updateData.status = status
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null

    // 如果状态设置为已完成，设置achievedAt
    if (status === 'achieved') {
      updateData.achievedAt = new Date()
    }

    const goal = await prisma.playerGoal.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json({ success: true, goal })
  } catch (error) {
    console.error('更新目标失败:', error)
    return NextResponse.json(
      { success: false, error: '更新目标失败' },
      { status: 500 }
    )
  }
}

// 删除目标
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.playerGoal.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除目标失败:', error)
    return NextResponse.json(
      { success: false, error: '删除目标失败' },
      { status: 500 }
    )
  }
}