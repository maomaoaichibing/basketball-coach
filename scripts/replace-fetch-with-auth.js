/**
 * 自动将裸 fetch('/api/...') 替换为 fetchWithAuth('/api/...')
 * 
 * 跳过规则：
 * - 公开 API（auth/login, auth/register, players/import, notifications/check）
 * - 已经使用 fetchWithAuth 的调用
 * - 非 'use client' 页面（不会在客户端调用 fetch）
 */

const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, '..', 'src', 'app');
const LIB_DIR = path.join(__dirname, '..', 'src', 'lib');

// 公开 API 路径（不替换）
const PUBLIC_APIS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/me',
  '/api/players/import',
  '/api/notifications/check',
  '/api/voice/recognize',
];

function isPublicApi(apiPath) {
  // 提取 API 路径（到第一个参数的逗号或反引号为止）
  const cleanPath = apiPath.replace(/['"`]/g, '').split(/[,\n]/)[0].trim();
  return PUBLIC_APIS.some(pub => cleanPath === pub || cleanPath.startsWith(pub + '?'));
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 检查是否是 'use client' 组件
  const isClient = content.includes("'use client'") || content.includes('"use client"');
  
  // 检查是否已经有 fetchWithAuth import
  const hasImport = content.includes("from '@/lib/auth'");
  
  // 查找所有 fetch('/api/...') 调用
  // 匹配模式：fetch('/api/xxx') 或 fetch('/api/xxx',  或 fetch(`/api/xxx`)
  const fetchRegex = /(?<!fetchWithAuth\()fetch\((['"`])\/api\/([^'"`\)]+)(?:\1)/g;
  
  let match;
  let replacements = [];
  let newContent = content;
  let offset = 0;
  
  // 重置 regex
  fetchRegex.lastIndex = 0;
  
  while ((match = fetchRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const quote = match[1];
    const apiPath = `/api/${match[2]}`;
    
    // 检查是否是公开 API
    if (isPublicApi(apiPath)) {
      continue;
    }
    
    // 检查是否已经在一个 fetchWithAuth 调用中（避免双重替换）
    const beforeMatch = content.substring(Math.max(0, match.index - 30), match.index);
    if (beforeMatch.includes('fetchWithAuth')) {
      continue;
    }
    
    replacements.push(apiPath);
    
    // 替换
    const start = match.index + offset;
    const end = start + fullMatch.length;
    newContent = newContent.substring(0, start) + `fetchWithAuth(${fullMatch}` + newContent.substring(end);
    offset += 'fetchWithAuth('.length;
  }
  
  if (replacements.length === 0) {
    return { status: 'skipped', reason: 'no fetch calls to replace' };
  }
  
  // 添加 fetchWithAuth import（如果需要）
  if (!hasImport) {
    // 找到最后一个 import 行
    const importRegex = /^import .+;$/gm;
    const imports = [...newContent.matchAll(importRegex)];
    
    if (imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const insertPos = lastImport.index + lastImport[0].length;
      const importLine = "\nimport { fetchWithAuth } from '@/lib/auth';";
      newContent = newContent.substring(0, insertPos) + importLine + newContent.substring(insertPos);
    }
  } else {
    // 在已有 import 中添加 fetchWithAuth
    if (!newContent.includes('fetchWithAuth')) {
      // 找到 from '@/lib/auth' 的 import 行
      const authImportRegex = /import\s+\{([^}]+)\}\s+from\s+'@\/lib\/auth'/;
      const authMatch = newContent.match(authImportRegex);
      
      if (authMatch) {
        const existingImports = authMatch[1];
        const newImports = existingImports + ', fetchWithAuth';
        newContent = newContent.replace(authMatch[0], `import { ${newImports} } from '@/lib/auth'`);
      }
    }
  }
  
  fs.writeFileSync(filePath, newContent, 'utf-8');
  return { status: 'modified', count: replacements.length, apis: replacements };
}

// 主函数
function main() {
  console.log('🔍 扫描前端页面文件...\n');
  
  // 递归查找所有 .tsx 文件
  function findFiles(dir, base = '') {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = base ? `${base}/${entry.name}` : entry.name;
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...findFiles(fullPath, relativePath));
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        files.push({ filePath: fullPath, relativePath });
      }
    }
    
    return files;
  }
  
  const files = findFiles(APP_DIR);
  console.log(`📋 找到 ${files.length} 个文件\n`);
  
  let modified = 0;
  let skipped = 0;
  let totalReplacements = 0;
  
  for (const { filePath, relativePath } of files) {
    try {
      const result = processFile(filePath);
      if (result.status === 'modified') {
        console.log(`✅ ${relativePath} — 替换 ${result.count} 处`);
        result.apis.forEach(api => console.log(`   → ${api}`));
        modified++;
        totalReplacements += result.count;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`❌ ${relativePath} — ${err.message}`);
      skipped++;
    }
  }
  
  console.log(`\n📊 总结:`);
  console.log(`  ✅ 修改文件: ${modified}`);
  console.log(`  ⏭️  跳过文件: ${skipped}`);
  console.log(`  🔄 总替换数: ${totalReplacements}`);
}

main();
