import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 变量替换函数
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  return result
}

// GET /api/notifications/check - 检查并发送自动提醒
export async function GET() {
  try {
    const results: string[] = []

    // 1. 检查课时不足的学员 (剩余课时 <= 5)
    const lowHourEnrollments = await prisma.courseEnrollment.findMany({
      where: {
        status: 'active',
        AND: [
          { remainingHours: { lte: 5 } },
          { remainingHours: { gt: 0 } },
        ]
      },
      include: {
        player: {
          include: {
            guardians: true,
          },
        },
        course: true,
      },
    })

    for (const enrollment of lowHourEnrollments) {
      const guardian = enrollment.player.guardians[0]
      if (!guardian) continue

      // 检查是否已经发送过相同通知（7天内）
      const recentNotification = await prisma.notification.findFirst({
        where: {
          playerId: enrollment.playerId,
          template: { code: 'hours_low' },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      })

      if (recentNotification) continue

      // 获取模板
      const template = await prisma.notificationTemplate.findFirst({
        where: { code: 'hours_low', isActive: true },
      })

      if (!template) continue

      const variables: Record<string, string> = {
        guardianName: guardian.name,
        playerName: enrollment.player.name,
        courseName: enrollment.course.name,
        remainingHours: enrollment.remainingHours.toString(),
      }

      await prisma.notification.create({
        data: {
          templateId: template.id,
          playerId: enrollment.playerId,
          guardianId: guardian.id,
          guardianName: guardian.name,
          title: replaceVariables(template.title, variables),
          content: replaceVariables(template.content, variables),
          type: 'reminder',
          channel: 'in_app',
          status: 'sent',
          sentAt: new Date(),
          relatedType: 'enrollment',
          relatedId: enrollment.id,
        },
      })

      results.push(`已发送课时不足提醒: ${enrollment.player.name} - ${guardian.name}`)
    }

    // 2. 检查课程即将过期的学员 (7天内到期)
    const soonExpiring = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const expiringEnrollments = await prisma.courseEnrollment.findMany({
      where: {
        status: 'active',
        expireDate: {
          lte: soonExpiring,
          gte: new Date(),
        },
      },
      include: {
        player: {
          include: {
            guardians: true,
          },
        },
        course: true,
      },
    })

    for (const enrollment of expiringEnrollments) {
      const guardian = enrollment.player.guardians[0]
      if (!guardian) continue

      // 检查是否已经发送过相同通知（7天内）
      const recentNotification = await prisma.notification.findFirst({
        where: {
          playerId: enrollment.playerId,
          template: { code: 'course_expiring' },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      })

      if (recentNotification) continue

      const template = await prisma.notificationTemplate.findFirst({
        where: { code: 'course_expiring', isActive: true },
      })

      if (!template) continue

      const variables: Record<string, string> = {
        guardianName: guardian.name,
        playerName: enrollment.player.name,
        courseName: enrollment.course.name,
        expireDate: enrollment.expireDate?.toLocaleDateString('zh-CN') || '未知',
      }

      await prisma.notification.create({
        data: {
          templateId: template.id,
          playerId: enrollment.playerId,
          guardianId: guardian.id,
          guardianName: guardian.name,
          title: replaceVariables(template.title, variables),
          content: replaceVariables(template.content, variables),
          type: 'reminder',
          channel: 'in_app',
          status: 'sent',
          sentAt: new Date(),
          relatedType: 'enrollment',
          relatedId: enrollment.id,
        },
      })

      results.push(`已发送课程到期提醒: ${enrollment.player.name} - ${guardian.name}`)
    }

    return NextResponse.json({
      success: true,
      results,
      summary: `检查完成，共发送 ${results.length} 条提醒`,
    })
  } catch (error) {
    console.error('检查通知失败:', error)
    return NextResponse.json({ error: '检查通知失败' }, { status: 500 })
  }
}