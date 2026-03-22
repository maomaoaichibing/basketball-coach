import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET 获取分班推荐列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')
    const status = searchParams.get('status')

    const where: Record<string, string> = {}
    if (playerId) where.playerId = playerId
    if (status) where.status = status

    const recommendations = await prisma.teamRecommendation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json(recommendations)
  } catch (error) {
    console.error('获取分班推荐失败:', error)
    return NextResponse.json({ error: '获取分班推荐失败' }, { status: 500 })
  }
}

// POST 创建分班推荐
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { playerId, playerName, currentTeamId, currentTeamName, recommendedTeamId, recommendedTeamName, recommendedGroup, reason, abilityMatch, expectedImprovement } = body

    if (!playerId || !playerName || !recommendedTeamId || !recommendedTeamName || !reason) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 })
    }

    // 计算过期时间（30天后）
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const recommendation = await prisma.teamRecommendation.create({
      data: {
        playerId,
        playerName,
        currentTeamId,
        currentTeamName,
        recommendedTeamId,
        recommendedTeamName,
        recommendedGroup,
        reason,
        abilityMatch: abilityMatch || 0,
        expectedImprovement,
        expiresAt
      }
    })

    return NextResponse.json(recommendation)
  } catch (error) {
    console.error('创建分班推荐失败:', error)
    return NextResponse.json({ error: '创建分班推荐失败' }, { status: 500 })
  }
}
