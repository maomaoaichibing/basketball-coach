import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/growth-reports/[id] - 获取成长报告详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const report = await prisma.growthReport.findUnique({
      where: { id }
    })

    if (!report) {
      return NextResponse.json({ success: false, error: '报告不存在' }, { status: 404 })
    }

    const parsedReport = {
      ...report,
      abilities: JSON.parse(report.abilities || '{}'),
      trainingStats: JSON.parse(report.trainingStats || '{}'),
      matchStats: JSON.parse(report.matchStats || '{}'),
      strengths: JSON.parse(report.strengths || '[]'),
      improvements: JSON.parse(report.improvements || '[]'),
      goals: JSON.parse(report.goals || '[]')
    }

    return NextResponse.json({ success: true, report: parsedReport })
  } catch (error) {
    console.error('获取成长报告详情失败:', error)
    return NextResponse.json({ success: false, error: '获取成长报告详情失败' }, { status: 500 })
  }
}

// PUT /api/growth-reports/[id] - 更新成长报告
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.growthReport.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: '报告不存在' }, { status: 404 })
    }

    const {
      title,
      periodStart,
      periodEnd,
      reportType,
      abilities,
      trainingStats,
      matchStats,
      strengths,
      improvements,
      goals,
      overallRating,
      summary,
      coachId,
      coachName,
      status
    } = body

    const report = await prisma.growthReport.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(periodStart && { periodStart: new Date(periodStart) }),
        ...(periodEnd && { periodEnd: new Date(periodEnd) }),
        ...(reportType && { reportType }),
        ...(abilities && { abilities: typeof abilities === 'string' ? abilities : JSON.stringify(abilities) }),
        ...(trainingStats && { trainingStats: typeof trainingStats === 'string' ? trainingStats : JSON.stringify(trainingStats) }),
        ...(matchStats && { matchStats: typeof matchStats === 'string' ? matchStats : JSON.stringify(matchStats) }),
        ...(strengths && { strengths: typeof strengths === 'string' ? strengths : JSON.stringify(strengths) }),
        ...(improvements && { improvements: typeof improvements === 'string' ? improvements : JSON.stringify(improvements) }),
        ...(goals && { goals: typeof goals === 'string' ? goals : JSON.stringify(goals) }),
        ...(overallRating !== undefined && { overallRating }),
        ...(summary !== undefined && { summary }),
        ...(coachId !== undefined && { coachId }),
        ...(coachName !== undefined && { coachName }),
        ...(status && {
          status,
          ...(status === 'published' && { publishedAt: new Date() })
        })
      }
    })

    return NextResponse.json({ success: true, report })
  } catch (error) {
    console.error('更新成长报告失败:', error)
    return NextResponse.json({ success: false, error: '更新成长报告失败' }, { status: 500 })
  }
}

// DELETE /api/growth-reports/[id] - 删除成长报告
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.growthReport.delete({ where: { id } })

    return NextResponse.json({ success: true, message: '报告已删除' })
  } catch (error) {
    console.error('删除成长报告失败:', error)
    return NextResponse.json({ success: false, error: '删除成长报告失败' }, { status: 500 })
  }
}