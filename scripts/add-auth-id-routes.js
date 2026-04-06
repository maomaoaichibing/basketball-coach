/**
 * 专门为 [id] 动态路由添加 verifyAuth 中间件
 * 处理带 { params } 参数的 handler 签名
 */

const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');

// 公开路由（跳过）
const PUBLIC_ROUTES = ['coaches/[id]', 'coaches/[id]/reset-password'];

function isPublicRoute(routePath) {
  return PUBLIC_ROUTES.includes(routePath);
}

// 管理型路由 - 写操作需要 admin 角色
const ADMIN_WRITE_ROUTES = ['campuses/[id]', 'courses/[id]', 'schedules/[id]', 'notification-templates/[id]', 'courts/[id]'];

// 部分管理型路由（PUT/DELETE=admin, GET=认证用户）
const PARTIAL_ADMIN_ROUTES = ['leaves/[id]', 'orders/[id]', 'enrollments/[id]'];

function isAdminWrite(routePath) {
  return ADMIN_WRITE_ROUTES.includes(routePath);
}

function isPartialAdmin(routePath) {
  return PARTIAL_ADMIN_ROUTES.includes(routePath);
}

function addVerifyAuth(filePath, routePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  if (content.includes('verifyAuth')) {
    return { status: 'skipped', reason: 'already has verifyAuth' };
  }

  // 添加 import
  const importLine = "import { verifyAuth } from '@/lib/auth-middleware';";
  const importRegex = /^import .+;$/gm;
  const imports = [...content.matchAll(importRegex)];
  
  if (imports.length === 0) {
    return { status: 'skipped', reason: 'no imports found' };
  }

  const lastImport = imports[imports.length - 1];
  const insertPos = lastImport.index + lastImport[0].length;
  
  content = content.substring(0, insertPos) + '\n' + importLine + content.substring(insertPos);

  // 匹配带有 { params } 的 handler
  // 两种格式:
  // 1) export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // 2) export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const handlerRegex = /export async function (GET|POST|PUT|PATCH|DELETE)\(request: NextRequest, \{ params \}/g;
  let match;
  let addedCount = 0;

  while ((match = handlerRegex.exec(content)) !== null) {
    const method = match[1];
    const funcStart = match.index;
    
    // 找到函数体开始的 {
    const bracePos = content.indexOf('{', funcStart + match[0].length);
    if (bracePos === -1) continue;
    
    // 获取 { 之后的内容
    const afterBrace = content.substring(bracePos + 1);
    
    // 确定 auth 检查代码
    let authCheck;
    if (method === 'GET') {
      authCheck = '\n  const auth = await verifyAuth(request);\n  if (!auth.success) return auth.response;\n';
    } else if (isAdminWrite(routePath)) {
      authCheck = '\n  const auth = await verifyAuth(request, { roles: [\'admin\'] });\n  if (!auth.success) return auth.response;\n';
    } else if (isPartialAdmin(routePath)) {
      authCheck = '\n  const auth = await verifyAuth(request, { roles: [\'admin\'] });\n  if (!auth.success) return auth.response;\n';
    } else {
      authCheck = '\n  const auth = await verifyAuth(request);\n  if (!auth.success) return auth.response;\n';
    }
    
    // 找到 try { 的位置
    const tryMatch = afterBrace.match(/\s*\n\s*try\s*\{/);
    if (tryMatch) {
      const insertAt = bracePos + 1 + tryMatch.index;
      content = content.substring(0, insertAt) + authCheck + content.substring(insertAt);
      addedCount++;
    }
  }

  if (addedCount > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { status: 'modified', addedCount };
  }
  
  return { status: 'skipped', reason: 'no matching handlers' };
}

// 主函数
function main() {
  console.log('🔍 处理 [id] 动态路由文件...\n');
  
  // 查找所有 [id]/route.ts 文件
  const entries = fs.readdirSync(API_DIR, { withFileTypes: true });
  
  let modified = 0;
  let skipped = 0;
  
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const idDir = path.join(API_DIR, entry.name, '[id]');
    if (!fs.existsSync(idDir)) continue;
    
    const routeFile = path.join(idDir, 'route.ts');
    if (!fs.existsSync(routeFile)) continue;
    
    const routePath = `${entry.name}/[id]`;
    
    if (isPublicRoute(routePath)) {
      console.log(`⏭️  ${routePath} — 公开路由，跳过`);
      skipped++;
      continue;
    }
    
    try {
      const result = addVerifyAuth(routeFile, routePath);
      if (result.status === 'modified') {
        console.log(`✅ ${routePath} — 已添加 verifyAuth (${result.addedCount} 个方法)`);
        modified++;
      } else {
        console.log(`⏭️  ${routePath} — ${result.reason}`);
        skipped++;
      }
    } catch (err) {
      console.error(`❌ ${routePath} — ${err.message}`);
      skipped++;
    }
  }
  
  // 也处理 growth-reports/[id]
  const growthReportsIdDir = path.join(API_DIR, 'growth-reports', '[id]');
  const growthReportsFile = path.join(growthReportsIdDir, 'route.ts');
  if (fs.existsSync(growthReportsFile) && !fs.readFileSync(growthReportsFile, 'utf-8').includes('verifyAuth')) {
    const result = addVerifyAuth(growthReportsFile, 'growth-reports/[id]');
    if (result.status === 'modified') {
      console.log(`✅ growth-reports/[id] — 已添加 verifyAuth (${result.addedCount} 个方法)`);
      modified++;
    } else {
      console.log(`⏭️  growth-reports/[id] — ${result.reason}`);
      skipped++;
    }
  }
  
  // 处理 coaches/[id]/reset-password（Phase 4 已经处理了）
  
  console.log(`\n📊 总结:`);
  console.log(`  ✅ 修改: ${modified}`);
  console.log(`  ⏭️  跳过: ${skipped}`);
}

main();
