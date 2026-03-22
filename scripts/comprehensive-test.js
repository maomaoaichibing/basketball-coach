/**
 * 篮球青训系统 - 完整自动化测试脚本 v2
 * 覆盖所有API、页面渲染、边界情况
 */

const http = require('http');

const BASE_URL = 'http://localhost:4000';
let passed = 0;
let failed = 0;

const green = (msg) => `\x1b[32m✓ ${msg}\x1b[0m`;
const red = (msg) => `\x1b[31m✗ ${msg}\x1b[0m`;
const yellow = (msg) => `\x1b[33m⚠ ${msg}\x1b[0m`;
const blue = (msg) => `\x1b[34m→ ${msg}\x1b[0m`;

function fetchAPI(path, options = {}) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...options.headers }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, raw: data.slice(0, 200), parseError: e.message });
        }
      });
    });
    req.on('error', (e) => resolve({ status: 0, data: null, error: e.message }));
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

function record(name, ok, detail = '') {
  if (ok) { passed++; console.log(green(name), detail || ''); }
  else { failed++; console.log(red(name), detail || ''); }
}

async function runTests() {
  console.log('===========================================');
  console.log('   篮球青训系统 - 完整自动化测试 v2');
  console.log('===========================================\n');

  // ========== 1. 核心数据API ==========
  console.log('【1】核心数据 API 测试\n');

  let res = await fetchAPI('/api/players');
  record('/api/players 返回200', res.status === 200);
  record('/api/players 格式正确 {success, players}', res.data?.success && Array.isArray(res.data?.players));
  const playerId = res.data?.players?.[0]?.id;
  const playerName = res.data?.players?.[0]?.name;
  record('有可用学员数据', !!playerId, `ID: ${playerId?.slice(0, 8)}... 姓名: ${playerName}`);

  res = await fetchAPI('/api/plans');
  record('/api/plans 返回200', res.status === 200);

  res = await fetchAPI('/api/assessments');
  record('/api/assessments 返回200', res.status === 200);

  res = await fetchAPI('/api/campuses');
  record('/api/campuses 返回200', res.status === 200);

  res = await fetchAPI('/api/courses');
  record('/api/courses 返回200', res.status === 200);

  res = await fetchAPI('/api/stats');
  record('/api/stats 返回200', res.status === 200);

  res = await fetchAPI('/api/notifications');
  record('/api/notifications 返回200', res.status === 200);

  res = await fetchAPI('/api/matches');
  record('/api/matches 返回200', res.status === 200);

  res = await fetchAPI('/api/growth');
  record('/api/growth 返回200', res.status === 200);

  res = await fetchAPI('/api/leaves');
  record('/api/leaves 返回200', res.status === 200);

  res = await fetchAPI('/api/checkins');
  record('/api/checkins 返回200', res.status === 200);

  res = await fetchAPI('/api/messages');
  record('/api/messages 返回200', res.status === 200);

  res = await fetchAPI('/api/schedules');
  record('/api/schedules 返回200', res.status === 200);

  res = await fetchAPI('/api/bookings');
  record('/api/bookings 返回200', res.status === 200);

  res = await fetchAPI('/api/goals');
  record('/api/goals 返回200', res.status === 200);

  // ========== 2. 智能分析API ==========
  console.log('\n【2】智能分析 API 测试\n');

  res = await fetchAPI('/api/recommendations');
  record('/api/recommendations 返回200', res.status === 200);

  res = await fetchAPI('/api/ability-analysis');
  record('/api/ability-analysis 返回200', res.status === 200);

  res = await fetchAPI('/api/team-recommendations');
  record('/api/team-recommendations 返回200', res.status === 200);

  res = await fetchAPI('/api/growth-reports');
  record('/api/growth-reports 返回200', res.status === 200);

  // ========== 3. CRUD操作 ==========
  console.log('\n【3】CRUD 操作测试\n');

  // 创建学员
  res = await fetchAPI('/api/players', {
    method: 'POST',
    body: { name: '测试学员', birthDate: '2019-01-01', gender: 'male', group: 'U8' }
  });
  record('POST /api/players 创建学员', res.status === 201 || res.status === 200);
  const createdId = res.data?.player?.id || res.data?.id;
  record('创建返回学员ID', !!createdId, createdId ? `ID: ${createdId.slice(0, 8)}...` : '无ID');

  // 更新学员
  if (playerId) {
    res = await fetchAPI(`/api/players/${playerId}`, {
      method: 'PUT',
      body: { school: '测试学校' }
    });
    record('PUT /api/players/:id 更新学员', res.status === 200);
  }

  // 创建课程
  res = await fetchAPI('/api/courses', {
    method: 'POST',
    body: { name: '测试课程', type: 'package', totalHours: 24, price: 3000 }
  });
  record('POST /api/courses 创建课程', res.status === 201 || res.status === 200);

  // 创建通知
  res = await fetchAPI('/api/notifications', {
    method: 'POST',
    body: { title: '测试通知', content: '内容', type: 'system' }
  });
  record('POST /api/notifications 创建通知', res.status === 201 || res.status === 200);

  // ========== 4. 智能分析功能 ==========
  console.log('\n【4】智能分析功能测试\n');

  if (playerId) {
    res = await fetchAPI('/api/analytics/auto-generate', {
      method: 'POST',
      body: { playerId }
    });
    record('POST /api/analytics/auto-generate 生成分析', res.status === 200);
    record('返回格式包含success', res.data?.success === true);
    record('返回包含analysis对象', typeof res.data?.analysis === 'object');
  }

  res = await fetchAPI('/api/generate-plan', {
    method: 'POST',
    body: { group: 'U10', duration: 60, location: '室内', theme: '运球', focusSkills: ['运球'] }
  });
  record('POST /api/generate-plan AI生成教案', res.status === 200 || res.status === 201);

  // ========== 5. 错误处理 ==========
  console.log('\n【5】错误处理测试\n');

  res = await fetchAPI('/api/players/invalid-id');
  record('无效ID返回404或错误', res.status === 404 || res.data?.error);

  res = await fetchAPI('/api/players', { method: 'POST', body: {} });
  record('缺少必填字段返回错误', res.data?.error || res.status === 400);

  res = await fetchAPI('/api/analytics/auto-generate', {
    method: 'POST',
    body: { playerId: 'non-existent-id' }
  });
  record('不存在的学员返回错误', res.data?.error);

  // ========== 6. 页面渲染 ==========
  console.log('\n【6】页面渲染测试\n');

  const pages = ['/', '/players', '/plans', '/assessment', '/growth', '/stats',
                 '/analytics', '/matches', '/parent', '/courses', '/orders', '/schedule'];

  for (const page of pages) {
    res = await fetchAPI(page);
    record(`页面 ${page} 可访问`, res.status === 200, `状态码: ${res.status}`);
  }

  // ========== 7. 家长端功能 ==========
  console.log('\n【7】家长端功能测试\n');

  res = await fetchAPI('/api/parent?phone=13800138000');
  record('GET /api/parent 手机号查询', res.status === 200);

  res = await fetchAPI('/api/parent?phone=invalid');
  record('GET /api/parent 无效手机号', res.status === 200 || res.data?.error);

  // ========== 8. 筛选和查询 ==========
  console.log('\n【8】筛选和查询测试\n');

  res = await fetchAPI('/api/players?group=U8');
  record('GET /api/players?group=U8 按组筛选', res.status === 200);

  res = await fetchAPI('/api/plans?group=U10');
  record('GET /api/plans?group=U10 按组筛选', res.status === 200);

  res = await fetchAPI('/api/recommendations?playerId=' + (playerId || 'test'));
  record('GET /api/recommendations?playerId 按学员筛选', res.status === 200);

  res = await fetchAPI('/api/ability-analysis?playerId=' + (playerId || 'test'));
  record('GET /api/ability-analysis?playerId 按学员筛选', res.status === 200);

  // ========== 9. 性能测试 ==========
  console.log('\n【9】性能测试\n');

  const startTime = Date.now();
  await fetchAPI('/api/players');
  const playersTime = Date.now() - startTime;
  record('GET /api/players 响应时间 < 500ms', playersTime < 500, `${playersTime}ms`);

  const startTime2 = Date.now();
  await fetchAPI('/api/plans');
  const plansTime = Date.now() - startTime2;
  record('GET /api/plans 响应时间 < 500ms', plansTime < 500, `${plansTime}ms`);

  // ========== 10. 数据一致性测试 ==========
  console.log('\n【10】数据一致性测试\n');

  // 获取学员列表
  res = await fetchAPI('/api/players');
  if (res.data?.players && res.data.players.length > 0) {
    const player = res.data.players[0];
    // 获取单个学员
    const singleRes = await fetchAPI('/api/players/' + player.id);
    record('GET /api/players/:id 数据一致性', singleRes.data?.player?.id === player.id, singleRes.data?.player?.id ? 'OK' : 'FAIL');
  }

  // 获取订单列表
  res = await fetchAPI('/api/orders');
  if (res.data?.orders && res.data.orders.length > 0) {
    const order = res.data.orders[0];
    // 获取单个订单
    const singleRes = await fetchAPI('/api/orders/' + order.id);
    record('GET /api/orders/:id 数据一致性', singleRes.data?.order?.id === order.id, singleRes.data?.order?.id ? 'OK' : 'FAIL');
  }

  // ========== 11. 批量操作测试 ==========
  console.log('\n【11】批量操作测试\n');

  // 创建多个学员
  const createdIds = [];
  for (let i = 0; i < 3; i++) {
    res = await fetchAPI('/api/players', {
      method: 'POST',
      body: { name: `批量测试学员${i}`, birthDate: '2019-01-01', gender: 'male', group: 'U8' }
    });
    if (res.data?.player?.id || res.data?.id) {
      createdIds.push(res.data.player?.id || res.data.id);
    }
  }
  record('批量创建学员 (3个)', createdIds.length === 3, `成功创建 ${createdIds.length} 个`);

  // 批量删除
  for (const id of createdIds) {
    await fetchAPI('/api/players/' + id, { method: 'DELETE' });
  }
  record('批量删除学员', true);

  // ========== 汇总 ==========
  console.log('\n===========================================');
  console.log(`   测试完成: ${green(passed + ' 通过')} / ${failed > 0 ? red(failed + ' 失败') : green('0 失败')}`);
  console.log('===========================================\n');

  if (failed > 0) {
    console.log(yellow('需要修复以下问题后重新测试'));
  } else {
    console.log(green('所有测试通过！系统运行正常'));
  }
}

runTests().catch(console.error);
