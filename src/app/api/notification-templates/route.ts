import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 预设的通知模板
const defaultTemplates = [
  {
    code: 'hours_low',
    name: '课时不足提醒',
    category: 'reminder',
    title: '课时不足提醒',
    content: '亲爱的{{guardianName}}，您家孩子{{playerName}}的{{courseName}}课程剩余课时已不足{{remainingHours}}课时，建议及时续费。',
    variables: '["guardianName", "playerName", "courseName", "remainingHours"]',
    isActive: true,
    isAutomated: true,
    priority: 'high',
  },
  {
    code: 'course_expiring',
    name: '课程即将过期提醒',
    category: 'reminder',
    title: '课程即将到期提醒',
    content: '亲爱的{{guardianName}}，您家孩子{{playerName}}的{{courseName}}课程将于{{expireDate}}到期，请注意合理安排训练时间。',
    variables: '["guardianName", "playerName", "courseName", "expireDate"]',
    isActive: true,
    isAutomated: true,
    priority: 'normal',
  },
  {
    code: 'booking_confirmed',
    name: '预约成功通知',
    category: 'course',
    title: '课程预约成功',
    content: '亲爱的{{guardianName}}，您已成功为孩子{{playerName}}预约{{courseName}}课程，时间：{{bookingDate}} {{bookingTime}}，地点：{{location}}。',
    variables: '["guardianName", "playerName", "courseName", "bookingDate", "bookingTime", "location"]',
    isActive: true,
    isAutomated: true,
    priority: 'normal',
  },
  {
    code: 'booking_reminder',
    name: '课程开始提醒',
    category: 'reminder',
    title: '课程即将开始提醒',
    content: '亲爱的{{guardianName}}，您家孩子{{playerName}}的{{courseName}}课程将于{{bookingTime}}开始，请提前10分钟到达{{location}}。',
    variables: '["guardianName", "playerName", "courseName", "bookingTime", "location"]',
    isActive: true,
    isAutomated: true,
    priority: 'high',
  },
  {
    code: 'training_completed',
    name: '训练完成通知',
    category: 'course',
    title: '训练课完成',
    content: '亲爱的{{guardianName}}，您家孩子{{playerName}}今日训练已完成。本次训练主题：{{trainingTheme}}，教练评价：{{coachFeedback}}。',
    variables: '["guardianName", "playerName", "trainingTheme", "coachFeedback"]',
    isActive: true,
    isAutomated: true,
    priority: 'low',
  },
  {
    code: 'assessment_ready',
    name: '评估报告已生成',
    category: 'system',
    title: '能力评估报告已生成',
    content: '亲爱的{{guardianName}}，您家孩子{{playerName}}的最新能力评估报告已生成。综合评分：{{overallScore}}分。点击查看详情。',
    variables: '["guardianName", "playerName", "overallScore"]',
    isActive: true,
    isAutomated: true,
    priority: 'normal',
  },
]

// GET /api/notification-templates - 获取通知模板列表
export async function GET() {
  try {
    let templates = await prisma.notificationTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // 如果没有模板，初始化默认模板
    if (templates.length === 0) {
      for (const template of defaultTemplates) {
        await prisma.notificationTemplate.create({ data: template })
      }
      templates = await prisma.notificationTemplate.findMany({
        orderBy: { createdAt: 'desc' },
      })
    }

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('获取通知模板失败:', error)
    return NextResponse.json({ error: '获取通知模板失败' }, { status: 500 })
  }
}

// POST /api/notification-templates - 创建通知模板
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      code,
      name,
      category = 'system',
      title,
      content,
      variables = '[]',
      isActive = true,
      isAutomated = false,
      priority = 'normal',
    } = body

    const template = await prisma.notificationTemplate.create({
      data: {
        code,
        name,
        category,
        title,
        content,
        variables,
        isActive,
        isAutomated,
        priority,
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('创建通知模板失败:', error)
    return NextResponse.json({ error: '创建通知模板失败' }, { status: 500 })
  }
}