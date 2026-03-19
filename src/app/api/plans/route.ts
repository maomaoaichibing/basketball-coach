import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// 保存教案
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      title,
      date,
      duration,
      group,
      location,
      weather,
      theme,
      focusSkills,
      intensity,
      sections,
      notes,
      generatedBy
    } = body

    const plan = await prisma.trainingPlan.create({
      data: {
        title,
        date: new Date(date),
        duration: parseInt(duration),
        group,
        location,
        weather,
        theme,
        focusSkills: JSON.stringify(focusSkills || []),
        intensity,
        sections: JSON.stringify(sections || []),
        notes,
        generatedBy: generatedBy || 'rule',
        status: 'published'
      }
    })

    return NextResponse.json({ success: true, id: plan.id, plan })
  } catch (error) {
    console.error('保存教案失败:', error)
    return NextResponse.json(
      { success: false, error: '保存教案失败' },
      { status: 500 }
    )
  }
}

// 获取教案列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const group = searchParams.get('group')
    const limit = parseInt(searchParams.get('limit') || '10')

    const where = group ? { group } : {}

    const plans = await prisma.trainingPlan.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    return NextResponse.json({ success: true, plans })
  } catch (error) {
    console.error('获取教案列表失败:', error)
    return NextResponse.json(
      { success: false, error: '获取教案列表失败' },
      { status: 500 }
    )
  }
}
