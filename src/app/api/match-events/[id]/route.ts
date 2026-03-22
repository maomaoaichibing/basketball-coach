import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/match-events/[id] - 获取比赛事件详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const event = await prisma.matchEvent.findUnique({
      where: { id },
      include: {
        match: { select: { id: true, title: true, teamName: true, opponent: true } }
      }
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: '比赛事件不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      event
    })
  } catch (error) {
    console.error('获取比赛事件详情失败:', error)
    return NextResponse.json(
      { success: false, error: '获取比赛事件详情失败' },
      { status: 500 }
    )
  }
}

// PUT /api/match-events/[id] - 更新比赛事件
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const {
      matchId,
      eventType,
      eventTime,
      quarter,
      playerId,
      playerName,
      points,
      description,
      relatedPlayerId,
      relatedPlayerName,
      courtZone
    } = body

    // 检查是否存在
    const existing = await prisma.matchEvent.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '比赛事件不存在' },
        { status: 404 }
      )
    }

    const event = await prisma.matchEvent.update({
      where: { id },
      data: {
        matchId,
        eventType,
        eventTime,
        quarter,
        playerId,
        playerName,
        points,
        description,
        relatedPlayerId,
        relatedPlayerName,
        courtZone
      }
    })

    return NextResponse.json({
      success: true,
      event
    })
  } catch (error) {
    console.error('更新比赛事件失败:', error)
    return NextResponse.json(
      { success: false, error: '更新比赛事件失败' },
      { status: 500 }
    )
  }
}

// DELETE /api/match-events/[id] - 删除比赛事件
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // 检查是否存在
    const existing = await prisma.matchEvent.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '比赛事件不存在' },
        { status: 404 }
      )
    }

    await prisma.matchEvent.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: '比赛事件已删除'
    })
  } catch (error) {
    console.error('删除比赛事件失败:', error)
    return NextResponse.json(
      { success: false, error: '删除比赛事件失败' },
      { status: 500 }
    )
  }
}