import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/team-recommendations/[id] - 获取分班推荐详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const recommendation = await prisma.teamRecommendation.findUnique({
      where: { id }
    })

    if (!recommendation) {
      return NextResponse.json(
        { success: false, error: '分班推荐不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      recommendation
    })
  } catch (error) {
    console.error('获取分班推荐详情失败:', error)
    return NextResponse.json(
      { success: false, error: '获取分班推荐详情失败' },
      { status: 500 }
    )
  }
}

// PUT /api/team-recommendations/[id] - 更新分班推荐
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const {
      currentTeamId,
      currentTeamName,
      recommendedTeamId,
      recommendedTeamName,
      recommendedGroup,
      reason,
      abilityMatch,
      expectedImprovement,
      status,
      handledBy,
      handledAt
    } = body

    // 检查是否存在
    const existing = await prisma.teamRecommendation.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '分班推荐不存在' },
        { status: 404 }
      )
    }

    const recommendation = await prisma.teamRecommendation.update({
      where: { id },
      data: {
        currentTeamId,
        currentTeamName,
        recommendedTeamId,
        recommendedTeamName,
        recommendedGroup,
        reason,
        abilityMatch,
        expectedImprovement,
        status,
        handledBy,
        handledAt: handledAt ? new Date(handledAt) : undefined
      }
    })

    return NextResponse.json({
      success: true,
      recommendation
    })
  } catch (error) {
    console.error('更新分班推荐失败:', error)
    return NextResponse.json(
      { success: false, error: '更新分班推荐失败' },
      { status: 500 }
    )
  }
}

// DELETE /api/team-recommendations/[id] - 删除分班推荐
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // 检查是否存在
    const existing = await prisma.teamRecommendation.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '分班推荐不存在' },
        { status: 404 }
      )
    }

    await prisma.teamRecommendation.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: '分班推荐已删除'
    })
  } catch (error) {
    console.error('删除分班推荐失败:', error)
    return NextResponse.json(
      { success: false, error: '删除分班推荐失败' },
      { status: 500 }
    )
  }
}