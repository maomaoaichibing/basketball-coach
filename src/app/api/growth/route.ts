import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/growth - 获取所有学员的成长数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const group = searchParams.get('group')

    const where: any = {}
    if (group && group !== 'all') {
      where.group = group
    }

    // 获取所有学员及其最新评估
    const players = await prisma.player.findMany({
      where,
      include: {
        assessments: {
          orderBy: { assessedAt: 'desc' },
          take: 6  // 最近6次评估用于趋势
        },
        records: {
          orderBy: { recordedAt: 'desc' },
          take: 10
        },
        _count: {
          select: {
            records: true,
            assessments: true
          }
        }
      },
      orderBy: [
        { group: 'asc' },
        { name: 'asc' }
      ]
    })

    // 计算趋势（最近两次评估的差异）
    const growthData = players.map(player => {
      const sortedAssessments = [...player.assessments].sort(
        (a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime()
      )
      const latest = sortedAssessments[0]
      const previous = sortedAssessments[1]

      // 计算各技能趋势
      const trend: Record<string, number> = {}
      const skills = ['dribbling', 'passing', 'shooting', 'defending', 'physical', 'tactical']

      skills.forEach(skill => {
        const latestVal = (latest as any)?.[skill] || 0
        const previousVal = (previous as any)?.[skill] || 0
        trend[skill] = latestVal - previousVal
      })

      // 计算训练出勤率
      const totalRecords = player.records.length
      const presentCount = player.records.filter(r => r.attendance === 'present').length
      const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0

      return {
        id: player.id,
        name: player.name,
        group: player.group,
        status: player.status,
        avatar: player.name.charAt(0),
        // 当前能力值
        abilities: {
          dribbling: latest?.dribbling || player.dribbling,
          passing: latest?.passing || player.passing,
          shooting: latest?.shooting || player.shooting,
          defending: latest?.defending || player.defending,
          physical: latest?.physical || player.physical,
          tactical: latest?.tactical || player.tactical
        },
        avgAbility: latest?.overall || Math.round(
          ((latest?.dribbling || player.dribbling) +
           (latest?.passing || player.passing) +
           (latest?.shooting || player.shooting) +
           (latest?.defending || player.defending) +
           (latest?.physical || player.physical) +
           (latest?.tactical || player.tactical)) / 6 * 10
        ) / 10,
        // 趋势
        trend,
        // 统计
        lastAssessment: latest?.assessedAt || null,
        totalTrainings: player._count.records,
        attendanceRate,
        presentCount,
        absentCount: totalRecords - presentCount,
        // 历史评估（用于图表）
        assessmentHistory: sortedAssessments.slice(0, 6).map(a => ({
          date: a.assessedAt,
          dribbling: a.dribbling,
          passing: a.passing,
          shooting: a.shooting,
          defending: a.defending,
          physical: a.physical,
          tactical: a.tactical,
          overall: a.overall
        }))
      }
    })

    return NextResponse.json({
      success: true,
      players: growthData,
      total: growthData.length
    })
  } catch (error) {
    console.error('获取成长数据失败:', error)
    return NextResponse.json(
      { success: false, error: '获取成长数据失败' },
      { status: 500 }
    )
  }
}