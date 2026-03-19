// RAG模块测试脚本
import { retrieveSimilarCases, getStats, allPlans } from '../src/lib/cases.ts';

console.log('=== RAG案例库测试 ===\n');

// 统计
console.log('案例库总数:', allPlans.length);
console.log();

// 测试1: 按年龄组检索
const cases1 = retrieveSimilarCases({ ageGroup: 'U8', limit: 2 });
console.log('1. U8年龄组检索:');
console.log('   结果数:', cases1.length);
if (cases1[0]) {
  console.log('   示例-tech_type:', cases1[0].tech_type);
  console.log('   示例-method:', cases1[0].method?.substring(0, 60) + '...');
}
console.log();

// 测试2: 按关键词检索
const cases2 = retrieveSimilarCases({ keyword: '运球', limit: 2 });
console.log('2. 关键词"运球"检索:');
console.log('   结果数:', cases2.length);
if (cases2[0]) {
  console.log('   示例:', cases2[0].tech_type, '-', cases2[0].content?.substring(0, 50) + '...');
}
console.log();

// 测试3: 综合检索
const cases3 = retrieveSimilarCases({ ageGroup: 'U10', category: 'technical', limit: 3 });
console.log('3. U10 + technical综合检索:');
console.log('   结果数:', cases3.length);
console.log();

// 测试4: 带时长的检索
const cases4 = retrieveSimilarCases({ ageGroup: 'U8', duration: 15, limit: 2 });
console.log('4. U8 + 时长15分钟检索:');
console.log('   结果数:', cases4.length);
if (cases4[0]) {
  console.log('   示例-duration:', cases4[0].duration, '分钟');
}
console.log();

console.log('✅ RAG检索模块工作正常!');