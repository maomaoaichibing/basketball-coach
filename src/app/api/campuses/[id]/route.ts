import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/campuses/[id] - 获取单个校区
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const campus = await prisma.campus.findUnique({
      where: { id },
      include: {
        players: { take: 10, orderBy: { createdAt: 'desc' } },
        teams: true,
        coaches: true,
        courts: true,
      },
    })

    if (!campus) {
      return NextResponse.json({ error: '校区不存在' }, { status: 404 })
    }

    return NextResponse.json({ campus })
  } catch (error) {
    console.error('获取校区失败:', error)
    return NextResponse.json({ error: '获取校区失败' }, { status: 500 })
  }
}

// PUT /api/campuses/[id] - 更新校区
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name,
      address,
      phone,
      managerName,
      latitude,
      longitude,
      openTime,
      closeTime,
      status,
      description,
    } = body

    const campus = await prisma.campus.update({
      where: { id },
      data: {
        name,
        address,
        phone,
        managerName,
        latitude,
        longitude,
        openTime,
        closeTime,
        status,
        description,
      },
    })

    return NextResponse.json({ campus })
  } catch (error) {
    console.error('更新校区失败:', error)
    return NextResponse.json({ error: '更新校区失败' }, { status: 500 })
  }
}

// DELETE /api/campuses/[id] - 删除校区
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 检查校区是否有关联数据
    const campus = await prisma.campus.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            players: true,
            teams: true,
            coaches: true,
            courts: true,
          },
        },
      },
    })

    if (!campus) {
      return NextResponse.json({ error: '校区不存在' }, { status: 404 })
    }

    if (campus._count.players > 0 || campus._count.teams > 0) {
      return NextResponse.json(
        { error: '该校区下有学员或球队，无法删除' },
        { status: 400 }
      )
    }

    // 级联删除场地和教练
    await prisma.court.deleteMany({ where: { campusId: id } })
    await prisma.coach.deleteMany({ where: { campusId: id } })
    await prisma.campus.delete({ where: { id } })

    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除校区失败:', error)
    return NextResponse.json({ error: '删除校区失败' }, { status: 500 })
  }
}