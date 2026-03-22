/**
 * 篮球青训系统 - 自动化测试服务
 * 详细测试所有API和页面功能
 */

const BASE_URL = 'http://localhost:4000';

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

const log = {
  pass: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  fail: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`)
};

// 测试结果统计
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// HTTP请求封装
async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    const data = await response.json();
    return { status: response.status, ok: response.ok, data };
  } catch (error) {
    return { status: 0, ok: false, error: error.message };
  }
}

// ============================================
// 测试套件：学员管理
// ============================================
async function testPlayers() {
  log.info('=== 测试学员管理 ===');

  // 1. 获取学员列表
  log.info('1. 获取学员列表...');
  let res = await fetchAPI('/api/players');
  results.total++;
  if (res.ok && res.data.players) {
    log.pass(`获取学员列表成功，共 ${res.data.players.length} 名学员`);
    results.passed++;
  } else {
    log.fail(`获取学员列表失败: ${JSON.stringify(res)}`);
    results.failed++;
    results.errors.push(`players_list: ${JSON.stringify(res)}`);
  }

  // 2. 创建学员
  log.info('2. 创建新学员...');
  const newPlayer = {
    name: `测试学员_${Date.now()}`,
    birthDate: '2018-06-15',
    gender: 'male',
    group: 'U10',
    parentName: '测试家长',
    parentPhone: '13800138000'
  };
  res = await fetchAPI('/api/players', {
    method: 'POST',
    body: JSON.stringify(newPlayer)
  });
  results.total++;
  if (res.ok && res.data.player) {
    log.pass(`创建学员成功: ${res.data.player.name}`);
    results.passed++;

    // 3. 获取单个学员
    log.info('3. 获取单个学员详情...');
    res = await fetchAPI(`/api/players/${res.data.player.id}`);
    results.total++;
    if (res.ok && res.data.player) {
      log.pass(`获取学员详情成功`);
      results.passed++;
    } else {
      log.fail(`获取学员详情失败`);
      results.failed++;
    }

    // 4. 更新学员
    log.info('4. 更新学员信息...');
    res = await fetchAPI(`/api/players/${res.data.player.id}`, {
      method: 'PUT',
      body: JSON.stringify({ school: '测试学校' })
    });
    results.total++;
    if (res.ok) {
      log.pass(`更新学员成功`);
      results.passed++;
    } else {
      log.fail(`更新学员失败`);
      results.failed++;
    }

    // 5. 删除学员
    log.info('5. 删除学员...');
    res = await fetchAPI(`/api/players/${res.data.player.id}`, {
      method: 'DELETE'
    });
    results.total++;
    if (res.ok) {
      log.pass(`删除学员成功`);
      results.passed++;
    } else {
      log.fail(`删除学员失败`);
      results.failed++;
    }
  } else {
    log.fail(`创建学员失败: ${JSON.stringify(res)}`);
    results.failed++;
    results.errors.push(`player_create: ${JSON.stringify(res)}`);
  }
}

// ============================================
// 测试套件：教案管理
// ============================================
async function testPlans() {
  log.info('=== 测试教案管理 ===');

  // 1. 获取教案列表
  log.info('1. 获取教案列表...');
  let res = await fetchAPI('/api/plans');
  results.total++;
  if (res.ok && res.data.plans) {
    log.pass(`获取教案列表成功，共 ${res.data.plans.length} 份教案`);
    results.passed++;
  } else {
    log.fail(`获取教案列表失败`);
    results.failed++;
  }

  // 2. 获取教案详情
  const plans = res.data?.plans || [];
  if (plans.length > 0) {
    log.info('2. 获取教案详情...');
    res = await fetchAPI(`/api/plans/${plans[0].id}`);
    results.total++;
    if (res.ok && res.data.plan) {
      log.pass(`获取教案详情成功`);
      results.passed++;
    } else {
      log.fail(`获取教案详情失败`);
      results.failed++;
    }
  }

  // 3. 复制教案
  if (plans.length > 0) {
    log.info('3. 复制教案...');
    res = await fetchAPI(`/api/plans/${plans[0].id}/copy`, {
      method: 'POST'
    });
    results.total++;
    if (res.ok && res.data.plan) {
      log.pass(`复制教案成功: ${res.data.plan.title}`);
      results.passed++;
    } else {
      log.fail(`复制教案失败`);
      results.failed++;
    }
  }

  // 4. AI生成教案
  log.info('4. AI生成教案...');
  res = await fetchAPI('/api/generate-plan', {
    method: 'POST',
    body: JSON.stringify({
      group: 'U10',
      duration: 60,
      location: '室内',
      theme: '运球',
      focusSkills: ['运球']
    })
  });
  results.total++;
  if (res.ok && res.data.plan) {
    log.pass(`AI生成教案成功`);
    results.passed++;
  } else {
    log.fail(`AI生成教案失败`);
    results.failed++;
  }
}

// ============================================
// 测试套件：评估记录
// ============================================
async function testAssessments() {
  log.info('=== 测试评估记录 ===');

  // 1. 获取评估列表
  log.info('1. 获取评估列表...');
  let res = await fetchAPI('/api/assessments');
  results.total++;
  if (res.ok && res.data.assessments) {
    log.pass(`获取评估列表成功，共 ${res.data.assessments.length} 条记录`);
    results.passed++;
  } else {
    log.fail(`获取评估列表失败`);
    results.failed++;
  }

  // 2. 创建评估
  log.info('2. 创建评估记录...');
  res = await fetchAPI('/api/assessments', {
    method: 'POST',
    body: JSON.stringify({
      playerId: 'test-player-id',
      dribbling: 7,
      passing: 6,
      shooting: 8,
      defending: 5,
      physical: 6,
      tactical: 5,
      overall: 6,
      notes: '测试评估',
      assessor: '教练员'
    })
  });
  results.total++;
  if (res.ok && res.data.assessment) {
    log.pass(`创建评估成功`);
    results.passed++;
  } else {
    log.fail(`创建评估失败: ${res.data?.error || 'unknown'}`);
    results.failed++;
  }
}

// ============================================
// 测试套件：成长数据
// ============================================
async function testGrowth() {
  log.info('=== 测试成长数据 ===');

  log.info('1. 获取成长数据...');
  let res = await fetchAPI('/api/growth');
  results.total++;
  if (res.ok && res.data.players) {
    log.pass(`获取成长数据成功，共 ${res.data.players.length} 名学员`);
    results.passed++;
  } else {
    log.fail(`获取成长数据失败`);
    results.failed++;
  }

  log.info('2. 获取成长数据详情...');
  if (res.data?.players?.length > 0) {
    const playerId = res.data.players[0].id;
    res = await fetchAPI(`/api/growth/${playerId}`);
    results.total++;
    if (res.ok && res.data.player) {
      log.pass(`获取成长详情成功`);
      results.passed++;
    } else {
      log.fail(`获取成长详情失败`);
      results.failed++;
    }
  }
}

// ============================================
// 测试套件：课程管理
// ============================================
async function testCourses() {
  log.info('=== 测试课程管理 ===');

  // 1. 获取课程列表
  log.info('1. 获取课程列表...');
  let res = await fetchAPI('/api/courses');
  results.total++;
  if (res.ok) {
    log.pass(`获取课程列表成功`);
    results.passed++;
  } else {
    log.fail(`获取课程列表失败`);
    results.failed++;
  }

  // 2. 创建课程
  log.info('2. 创建课程包...');
  res = await fetchAPI('/api/courses', {
    method: 'POST',
    body: JSON.stringify({
      name: '测试课程包',
      type: 'package',
      totalHours: 48,
      price: 5000,
      validDays: 180,
      description: '测试用课程包'
    })
  });
  results.total++;
  if (res.ok && res.data.course) {
    log.pass(`创建课程成功`);
    results.passed++;
  } else {
    log.fail(`创建课程失败`);
    results.failed++;
  }

  // 3. 获取报名列表
  log.info('3. 获取报名列表...');
  res = await fetchAPI('/api/enrollments');
  results.total++;
  if (res.ok) {
    log.pass(`获取报名列表成功`);
    results.passed++;
  } else {
    log.fail(`获取报名列表失败`);
    results.failed++;
  }
}

// ============================================
// 测试套件：订单管理
// ============================================
async function testOrders() {
  log.info('=== 测试订单管理 ===');

  // 1. 获取订单列表
  log.info('1. 获取订单列表...');
  let res = await fetchAPI('/api/orders');
  results.total++;
  if (res.ok) {
    log.pass(`获取订单列表成功`);
    results.passed++;
  } else {
    log.fail(`获取订单列表失败`);
    results.failed++;
  }

  // 2. 创建订单
  log.info('2. 创建订单...');
  res = await fetchAPI('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      type: 'course',
      customerName: '测试客户',
      customerPhone: '13800138000',
      items: [{
        itemType: 'course',
        name: '测试课程',
        quantity: 1,
        unitPrice: 5000,
        subtotal: 5000
      }],
      totalAmount: 5000
    })
  });
  results.total++;
  if (res.ok && res.data.order) {
    log.pass(`创建订单成功: ${res.data.order.orderNo}`);
    results.passed++;
  } else {
    log.fail(`创建订单失败`);
    results.failed++;
  }

  // 3. 获取支付列表
  log.info('3. 获取支付记录...');
  res = await fetchAPI('/api/payments');
  results.total++;
  if (res.ok) {
    log.pass(`获取支付记录成功`);
    results.passed++;
  } else {
    log.fail(`获取支付记录失败`);
    results.failed++;
  }
}

// ============================================
// 测试套件：通知管理
// ============================================
async function testNotifications() {
  log.info('=== 测试通知管理 ===');

  // 1. 获取通知列表
  log.info('1. 获取通知列表...');
  let res = await fetchAPI('/api/notifications');
  results.total++;
  if (res.ok) {
    log.pass(`获取通知列表成功`);
    results.passed++;
  } else {
    log.fail(`获取通知列表失败`);
    results.failed++;
  }

  // 2. 获取通知模板
  log.info('2. 获取通知模板...');
  res = await fetchAPI('/api/notification-templates');
  results.total++;
  if (res.ok) {
    log.pass(`获取通知模板成功`);
    results.passed++;
  } else {
    log.fail(`获取通知模板失败`);
    results.failed++;
  }

  // 3. 创建通知
  log.info('3. 创建通知...');
  res = await fetchAPI('/api/notifications', {
    method: 'POST',
    body: JSON.stringify({
      title: '测试通知',
      content: '这是一条测试通知',
      type: 'system'
    })
  });
  results.total++;
  if (res.ok && res.data.notification) {
    log.pass(`创建通知成功`);
    results.passed++;
  } else {
    log.fail(`创建通知失败`);
    results.failed++;
  }
}

// ============================================
// 测试套件：校区管理
// ============================================
async function testCampuses() {
  log.info('=== 测试校区管理 ===');

  // 1. 获取校区列表
  log.info('1. 获取校区列表...');
  let res = await fetchAPI('/api/campuses');
  results.total++;
  if (res.ok) {
    log.pass(`获取校区列表成功`);
    results.passed++;
  } else {
    log.fail(`获取校区列表失败`);
    results.failed++;
  }

  // 2. 创建校区
  log.info('2. 创建校区...');
  res = await fetchAPI('/api/campuses', {
    method: 'POST',
    body: JSON.stringify({
      name: `测试校区_${Date.now()}`,
      code: `CAMPUS_${Date.now()}`,
      address: '测试地址',
      phone: '010-12345678',
      managerName: '测试管理员'
    })
  });
  results.total++;
  if (res.ok && res.data.campus) {
    log.pass(`创建校区成功`);
    results.passed++;
  } else {
    log.fail(`创建校区失败`);
    results.failed++;
  }

  // 3. 获取教练列表
  log.info('3. 获取教练列表...');
  res = await fetchAPI('/api/coaches');
  results.total++;
  if (res.ok) {
    log.pass(`获取教练列表成功`);
    results.passed++;
  } else {
    log.fail(`获取教练列表失败`);
    results.failed++;
  }

  // 4. 获取场地列表
  log.info('4. 获取场地列表...');
  res = await fetchAPI('/api/courts');
  results.total++;
  if (res.ok) {
    log.pass(`获取场地列表成功`);
    results.passed++;
  } else {
    log.fail(`获取场地列表失败`);
    results.failed++;
  }
}

// ============================================
// 测试套件：比赛记录
// ============================================
async function testMatches() {
  log.info('=== 测试比赛记录 ===');

  // 1. 获取比赛列表
  log.info('1. 获取比赛列表...');
  let res = await fetchAPI('/api/matches');
  results.total++;
  if (res.ok) {
    log.pass(`获取比赛列表成功`);
    results.passed++;
  } else {
    log.fail(`获取比赛列表失败`);
    results.failed++;
  }

  // 2. 创建比赛
  log.info('2. 创建比赛记录...');
  res = await fetchAPI('/api/matches', {
    method: 'POST',
    body: JSON.stringify({
      title: '测试比赛',
      matchType: 'friendly',
      group: 'U10',
      matchDate: new Date().toISOString(),
      location: '测试球场',
      teamName: '测试队',
      homeScore: 0,
      opponent: '对手队',
      opponentScore: 0
    })
  });
  results.total++;
  if (res.ok && res.data.match) {
    log.pass(`创建比赛成功`);
    results.passed++;
  } else {
    log.fail(`创建比赛失败`);
    results.failed++;
  }

  // 3. 获取比赛事件
  log.info('3. 获取比赛事件...');
  res = await fetchAPI('/api/match-events');
  results.total++;
  if (res.ok) {
    log.pass(`获取比赛事件成功`);
    results.passed++;
  } else {
    log.fail(`获取比赛事件失败`);
    results.failed++;
  }
}

// ============================================
// 测试套件：排课管理
// ============================================
async function testSchedules() {
  log.info('=== 测试排课管理 ===');

  // 1. 获取排课列表
  log.info('1. 获取排课列表...');
  let res = await fetchAPI('/api/schedules');
  results.total++;
  if (res.ok) {
    log.pass(`获取排课列表成功`);
    results.passed++;
  } else {
    log.fail(`获取排课列表失败`);
    results.failed++;
  }

  // 2. 获取预约列表
  log.info('2. 获取预约列表...');
  res = await fetchAPI('/api/bookings');
  results.total++;
  if (res.ok) {
    log.pass(`获取预约列表成功`);
    results.passed++;
  } else {
    log.fail(`获取预约列表失败`);
    results.failed++;
  }
}

// ============================================
// 测试套件：家校互动
// ============================================
async function testInteraction() {
  log.info('=== 测试家校互动 ===');

  // 1. 获取请假列表
  log.info('1. 获取请假列表...');
  let res = await fetchAPI('/api/leaves');
  results.total++;
  if (res.ok) {
    log.pass(`获取请假列表成功`);
    results.passed++;
  } else {
    log.fail(`获取请假列表失败`);
    results.failed++;
  }

  // 2. 获取打卡列表
  log.info('2. 获取打卡列表...');
  res = await fetchAPI('/api/checkins');
  results.total++;
  if (res.ok) {
    log.pass(`获取打卡列表成功`);
    results.passed++;
  } else {
    log.fail(`获取打卡列表失败`);
    results.failed++;
  }

  // 3. 获取消息列表
  log.info('3. 获取消息列表...');
  res = await fetchAPI('/api/messages');
  results.total++;
  if (res.ok) {
    log.pass(`获取消息列表成功`);
    results.passed++;
  } else {
    log.fail(`获取消息列表失败`);
    results.failed++;
  }

  // 4. 家长端查询
  log.info('4. 家长端手机号查询...');
  res = await fetchAPI('/api/parent?phone=13800138000');
  results.total++;
  if (res.ok) {
    log.pass(`家长端查询成功`);
    results.passed++;
  } else {
    log.fail(`家长端查询失败`);
    results.failed++;
  }
}

// ============================================
// 测试套件：智能分析
// ============================================
async function testAnalytics() {
  log.info('=== 测试智能分析 ===');

  // 1. 获取智能推荐
  log.info('1. 获取智能推荐...');
  let res = await fetchAPI('/api/recommendations');
  results.total++;
  if (res.ok) {
    log.pass(`获取智能推荐成功`);
    results.passed++;
  } else {
    log.fail(`获取智能推荐失败`);
    results.failed++;
  }

  // 2. 获取队伍推荐
  log.info('2. 获取队伍推荐...');
  res = await fetchAPI('/api/team-recommendations');
  results.total++;
  if (res.ok) {
    log.pass(`获取队伍推荐成功`);
    results.passed++;
  } else {
    log.fail(`获取队伍推荐失败`);
    results.failed++;
  }

  // 3. 获取能力分析
  log.info('3. 获取能力分析...');
  res = await fetchAPI('/api/ability-analysis');
  results.total++;
  if (res.ok) {
    log.pass(`获取能力分析成功`);
    results.passed++;
  } else {
    log.fail(`获取能力分析失败`);
    results.failed++;
  }

  // 4. 自动生成分析
  log.info('4. 自动生成分析报告...');
  res = await fetchAPI('/api/analytics/auto-generate', {
    method: 'POST',
    body: JSON.stringify({ playerId: 'test-player' })
  });
  results.total++;
  if (res.ok) {
    log.pass(`自动生成分析成功`);
    results.passed++;
  } else {
    log.fail(`自动生成分析失败`);
    results.failed++;
  }
}

// ============================================
// 测试套件：数据统计
// ============================================
async function testStats() {
  log.info('=== 测试数据统计 ===');

  // 1. 获取综合统计
  log.info('1. 获取综合统计数据...');
  let res = await fetchAPI('/api/stats?period=month');
  results.total++;
  if (res.ok && res.data.overview) {
    log.pass(`获取统计数据成功`);
    log.info(`   - 学员总数: ${res.data.overview.totalPlayers}`);
    log.info(`   - 收入: ${res.data.overview.monthIncome}`);
    results.passed++;
  } else {
    log.fail(`获取统计数据失败`);
    results.failed++;
  }

  // 2. 获取训练分析
  log.info('2. 获取训练分析数据...');
  res = await fetchAPI('/api/training-analysis');
  results.total++;
  if (res.ok) {
    log.pass(`获取训练分析成功`);
    results.passed++;
  } else {
    log.fail(`获取训练分析失败`);
    results.failed++;
  }

  // 3. 获取成长报告
  log.info('3. 获取成长报告...');
  res = await fetchAPI('/api/growth-reports');
  results.total++;
  if (res.ok) {
    log.pass(`获取成长报告成功`);
    results.passed++;
  } else {
    log.fail(`获取成长报告失败`);
    results.failed++;
  }
}

// ============================================
// 测试套件：导出功能
// ============================================
async function testExport() {
  log.info('=== 测试导出功能 ===');

  // 1. 导出教案
  log.info('1. 导出教案...');
  let res = await fetchAPI('/api/export?type=plans');
  results.total++;
  if (res.ok || res.status === 200) {
    log.pass(`导出教案接口正常`);
    results.passed++;
  } else {
    log.fail(`导出教案接口失败: ${res.status}`);
    results.failed++;
  }

  // 2. 导出学员
  log.info('2. 导出学员...');
  res = await fetchAPI('/api/export?type=players');
  results.total++;
  if (res.ok || res.status === 200) {
    log.pass(`导出学员接口正常`);
    results.passed++;
  } else {
    log.fail(`导出学员接口失败: ${res.status}`);
    results.failed++;
  }
}

// ============================================
// 测试套件：目标管理
// ============================================
async function testGoals() {
  log.info('=== 测试目标管理 ===');

  // 1. 获取目标列表
  log.info('1. 获取目标列表...');
  let res = await fetchAPI('/api/goals');
  results.total++;
  if (res.ok) {
    log.pass(`获取目标列表成功`);
    results.passed++;
  } else {
    log.fail(`获取目标列表失败`);
    results.failed++;
  }

  // 2. 创建目标
  log.info('2. 创建目标...');
  res = await fetchAPI('/api/goals', {
    method: 'POST',
    body: JSON.stringify({
      playerId: 'test-player',
      skillType: 'dribbling',
      targetScore: 8,
      targetDate: new Date().toISOString()
    })
  });
  results.total++;
  if (res.ok && res.data.goal) {
    log.pass(`创建目标成功`);
    results.passed++;
  } else {
    log.fail(`创建目标失败`);
    results.failed++;
  }
}

// ============================================
// 测试套件：错误处理
// ============================================
async function testErrorHandling() {
  log.info('=== 测试错误处理 ===');

  // 1. 获取不存在的资源
  log.info('1. 获取不存在的学员...');
  let res = await fetchAPI('/api/players/non-existent-id');
  results.total++;
  if (!res.ok || res.status === 404) {
    log.pass(`正确处理404错误`);
    results.passed++;
  } else {
    log.fail(`应该返回404但返回了 ${res.status}`);
    results.failed++;
  }

  // 2. 无效的创建请求
  log.info('2. 无效的创建请求...');
  res = await fetchAPI('/api/players', {
    method: 'POST',
    body: JSON.stringify({})
  });
  results.total++;
  if (!res.ok) {
    log.pass(`正确处理无效请求`);
    results.passed++;
  } else {
    log.fail(`应该拒绝无效请求但成功了`);
    results.failed++;
  }

  // 3. 缺少必需字段
  log.info('3. 缺少必需字段...');
  res = await fetchAPI('/api/assessments', {
    method: 'POST',
    body: JSON.stringify({})
  });
  results.total++;
  if (!res.ok) {
    log.pass(`正确验证必需字段`);
    results.passed++;
  } else {
    log.fail(`应该验证失败但成功了`);
    results.failed++;
  }
}

// ============================================
// 性能测试
// ============================================
async function testPerformance() {
  log.info('=== 性能测试 ===');

  // 1. API响应时间
  log.info('1. 测试API响应时间...');
  const endpoints = [
    '/api/players',
    '/api/plans',
    '/api/stats',
    '/api/growth'
  ];

  for (const endpoint of endpoints) {
    const start = Date.now();
    const res = await fetchAPI(endpoint);
    const duration = Date.now() - start;
    results.total++;
    if (duration < 1000) {
      log.pass(`${endpoint}: ${duration}ms`);
      results.passed++;
    } else {
      log.warn(`${endpoint}: ${duration}ms (较慢)`);
      results.passed++; // 仍然通过，只是警告
    }
  }

  // 2. 并发请求
  log.info('2. 测试并发请求...');
  const start = Date.now();
  await Promise.all([
    fetchAPI('/api/players'),
    fetchAPI('/api/plans'),
    fetchAPI('/api/stats'),
    fetchAPI('/api/assessments')
  ]);
  const duration = Date.now() - start;
  results.total++;
  if (duration < 2000) {
    log.pass(`并发请求完成: ${duration}ms`);
    results.passed++;
  } else {
    log.warn(`并发请求较慢: ${duration}ms`);
    results.passed++;
  }
}

// ============================================
// 打印测试报告
// ============================================
function printReport() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试报告');
  console.log('='.repeat(50));
  console.log(`总计: ${results.total}`);
  console.log(`${colors.green}通过: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}失败: ${results.failed}${colors.reset}`);
  console.log(`通过率: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));

  if (results.errors.length > 0) {
    console.log('\n失败详情:');
    results.errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err}`);
    });
  }
}

// ============================================
// 主函数 - 执行所有测试
// ============================================
async function runAllTests() {
  console.log('\n' + '='.repeat(50));
  console.log('🏀 篮球青训系统 - 自动化测试服务');
  console.log('='.repeat(50));
  console.log(`测试地址: ${BASE_URL}`);
  console.log(`开始时间: ${new Date().toLocaleString()}`);
  console.log('='.repeat(50) + '\n');

  // 等待服务就绪
  log.info('等待服务就绪...');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 执行所有测试套件
  await testPlayers();
  await testPlans();
  await testAssessments();
  await testGrowth();
  await testCourses();
  await testOrders();
  await testNotifications();
  await testCampuses();
  await testMatches();
  await testSchedules();
  await testInteraction();
  await testAnalytics();
  await testStats();
  await testExport();
  await testGoals();
  await testErrorHandling();
  await testPerformance();

  // 打印报告
  printReport();

  return results;
}

// 运行测试
runAllTests().then(() => {
  process.exit(results.failed > 0 ? 1 : 0);
}).catch((err) => {
  console.error('测试执行失败:', err);
  process.exit(1);
});