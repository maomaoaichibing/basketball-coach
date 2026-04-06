/**
 * 自动为所有 API 路由添加 verifyAuth 中间件的脚本
 * 
 * 规则：
 * - GET 方法 → verifyAuth(request)（所有已认证用户可访问）
 * - POST/PUT/PATCH/DELETE 方法：
 *   - 管理型路由（campuses, courses, schedules, notification-templates, courts, leaves, orders, enrollments）
 *     的写操作 → verifyAuth(request, { roles: ['admin'] })
 *   - 其他路由 → verifyAuth(request)（教练可管理自己的数据）
 * 
 * 公开路由（不添加认证）：
 * - auth/* （登录、注册、改密码）
 * - parent/* （家长端）
 * - players/import （批量导入）
 * - notifications/check （通知检查）
 * - voice/recognize GET （语音识别GET）
 * - coaches/* （已由 Phase 4 处理）
 */

const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');

// 公开路由（跳过）
const PUBLIC_ROUTES = [
  'auth/login', 'auth/register', 'auth/change-password', 'auth/me', 'auth/profile',
  'parent',
  'players/import',
  'notifications/check',
  'voice/recognize',
  'coaches', 'coaches/[id]', 'coaches/[id]/reset-password',
  // 已经手动处理过的
  'stats', 'export', 'training-analysis', 'growth', 'growth/[id]',
  'analytics/auto-generate', 'smart-plan', 'generate-plan',
];

// 管理型路由 - 写操作需要 admin 角色
const ADMIN_WRITE_ROUTES = [
  'campuses', 'campuses/[id]',
  'courses', 'courses/[id]',
  'schedules', 'schedules/[id]',
  'notification-templates', 'notification-templates/[id]',
  'courts', 'courts/[id]',
];

// 部分管理型路由（POST=admin, 其他=认证用户）
const PARTIAL_ADMIN_ROUTES = [
  'leaves', 'leaves/[id]',
  'orders', 'orders/[id]',
  'enrollments', 'enrollments/[id]',
];

function isPublicRoute(routePath) {
  return PUBLIC_ROUTES.some(r => routePath === r || routePath.startsWith(r + '/'));
}

function isAdminWriteRoute(routePath) {
  return ADMIN_WRITE_ROUTES.some(r => routePath === r);
}

function isPartialAdminRoute(routePath) {
  return PARTIAL_ADMIN_ROUTES.some(r => routePath === r);
}

function processRouteFile(filePath, routePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 检查是否已经有 verifyAuth
  if (content.includes('verifyAuth')) {
    return { status: 'skipped', reason: 'already has verifyAuth' };
  }

  // 检查是否有 import from '@/lib/db' 或 'new PrismaClient()'
  const hasDbImport = content.includes("from '@/lib/db'") || content.includes('new PrismaClient()');
  
  // 确定 import 位置
  const importLine = "import { verifyAuth } from '@/lib/auth-middleware';";
  
  // 找到最后一个 import 行
  const importRegex = /^import .+;$/gm;
  const imports = [...content.matchAll(importRegex)];
  
  if (imports.length === 0) {
    return { status: 'skipped', reason: 'no imports found' };
  }

  const lastImport = imports[imports.length - 1];
  const insertPos = lastImport.index + lastImport[0].length;
  
  // 在最后一个 import 后添加 verifyAuth import
  const beforeImport = content.substring(0, insertPos);
  const afterImport = content.substring(insertPos);
  
  // 检查是否需要空行
  const needsNewline = !afterImport.startsWith('\n\n') && !afterImport.startsWith('\n//');
  content = beforeImport + '\n' + importLine + (needsNewline ? '\n' : '') + afterImport;

  // 为每个 handler 方法添加 auth 检查
  const handlerRegex = /export async function (GET|POST|PUT|PATCH|DELETE)\s*\(/g;
  let handlerMatch;
  let addedCount = 0;

  while ((handlerMatch = handlerRegex.exec(content)) !== null) {
    const method = handlerMatch[1];
    const funcStart = handlerMatch.index;
    
    // 找到函数体的第一个 { 后的位置
    const bracePos = content.indexOf('{', funcStart);
    if (bracePos === -1) continue;
    
    // 找到 { 后面的第一个 try { 或 const
    const afterBrace = content.substring(bracePos + 1);
    let bodyStart;
    
    const tryMatch = afterBrace.match(/^\s*\n\s*try\s*\{/);
    if (tryMatch) {
      bodyStart = bracePos + 1 + tryMatch.index;
    } else {
      const constMatch = afterBrace.match(/^\s*\n\s*(const|let|var|if|switch|await)/);
      if (constMatch) {
        bodyStart = bracePos + 1 + constMatch.index;
      } else {
        // 看看下一行是什么
        const nextLine = afterBrace.match(/^\s*\n(\s*)/);
        if (nextLine) {
          bodyStart = bracePos + 1 + nextLine.index + nextLine[0].length;
        } else {
          continue;
        }
      }
    }
    
    // 确定 auth 参数
    let authCheck;
    if (method === 'GET') {
      authCheck = 'const auth = await verifyAuth(request);\n  if (!auth.success) return auth.response;\n\n  ';
    } else if (isAdminWriteRoute(routePath)) {
      authCheck = 'const auth = await verifyAuth(request, { roles: [\'admin\'] });\n  if (!auth.success) return auth.response;\n\n  ';
    } else if (isPartialAdminRoute(routePath)) {
      if (method === 'POST') {
        authCheck = 'const auth = await verifyAuth(request, { roles: [\'admin\'] });\n  if (!auth.success) return auth.response;\n\n  ';
      } else if (method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
        authCheck = 'const auth = await verifyAuth(request, { roles: [\'admin\'] });\n  if (!auth.success) return auth.response;\n\n  ';
      } else {
        authCheck = 'const auth = await verifyAuth(request);\n  if (!auth.success) return auth.response;\n\n  ';
      }
    } else {
      authCheck = 'const auth = await verifyAuth(request);\n  if (!auth.success) return auth.response;\n\n  ';
    }
    
    content = content.substring(0, bodyStart) + authCheck + content.substring(bodyStart);
    addedCount++;
  }

  if (addedCount > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { status: 'modified', addedCount };
  }
  
  return { status: 'skipped', reason: 'no handlers found' };
}

// 递归查找所有 route.ts 文件
function findRouteFiles(dir, basePath = '') {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const routePath = basePath ? `${basePath}/${entry.name}` : entry.name;
    
    if (entry.isDirectory()) {
      files.push(...findRouteFiles(fullPath, routePath));
    } else if (entry.name === 'route.ts') {
      files.push({ filePath: fullPath, routePath: basePath });
    }
  }
  
  return files;
}

// 主函数
function main() {
  console.log('🔍 扫描 API 路由文件...\n');
  
  const routeFiles = findRouteFiles(API_DIR);
  console.log(`📋 找到 ${routeFiles.length} 个路由文件\n`);
  
  let modified = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const { filePath, routePath } of routeFiles) {
    try {
      if (isPublicRoute(routePath)) {
        console.log(`⏭️  ${routePath} — 公开路由，跳过`);
        skipped++;
        continue;
      }
      
      const result = processRouteFile(filePath, routePath);
      
      if (result.status === 'modified') {
        console.log(`✅ ${routePath} — 已添加 verifyAuth (${result.addedCount} 个方法)`);
        modified++;
      } else if (result.status === 'skipped') {
        console.log(`⏭️  ${routePath} — ${result.reason}`);
        skipped++;
      }
    } catch (err) {
      console.error(`❌ ${routePath} — 错误: ${err.message}`);
      errors++;
    }
  }
  
  console.log(`\n📊 总结:`);
  console.log(`  ✅ 修改: ${modified}`);
  console.log(`  ⏭️  跳过: ${skipped}`);
  console.log(`  ❌ 错误: ${errors}`);
}

main();
