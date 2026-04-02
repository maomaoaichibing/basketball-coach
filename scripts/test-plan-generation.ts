#!/usr/bin/env node

/**
 * 测试教案生成功能
 * 验证：1. 慢跑时间≤3分钟 2. 包含组数/次数 3. 包含SVG图解
 */

const TEST_CASES = [
  {
    name: 'U10基础120分钟',
    params: {
      group: 'U10',
      duration: 120,
      location: '室内',
      weather: '晴天',
      theme: '运球基础',
      focusSkills: ['dribbling', 'footwork'],
      skillLevel: 'beginner',
      playerCount: 12,
    },
  },
];

async function testPlanGeneration() {
  console.log('🧪 开始测试教案生成...\n');

  for (const testCase of TEST_CASES) {
    console.log(`📋 测试用例: ${testCase.name}`);
    console.log(`   参数:`, JSON.stringify(testCase.params, null, 2));

    try {
      const response = await fetch('http://localhost:3000/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...testCase.params, debug: true }),
      });

      const result = await response.json();

      if (!result.success) {
        console.log(`   ❌ 生成失败: ${result.error}\n`);
        continue;
      }

      const plan = result.plan;
      console.log(`   ✅ 生成成功: ${plan.title}`);

      // 验证第一节
      const firstSection = plan.sections?.[0];
      if (firstSection) {
        console.log(`\n   📊 第一节验证 (${firstSection.duration}分钟):`);

        // 验证活动顺序
        const activities = firstSection.activities || [];
        console.log(`      活动数量: ${activities.length}`);

        activities.forEach((activity: any, idx: number) => {
          console.log(`      ${idx + 1}. ${activity.name} (${activity.duration}分钟)`);

          // 验证慢跑时间
          if (activity.name.includes('慢跑')) {
            if (activity.duration > 3) {
              console.log(`         ⚠️  警告: 慢跑时间${activity.duration}分钟，超过3分钟限制！`);
            } else {
              console.log(`         ✅ 慢跑时间符合要求`);
            }
          }

          // 验证组数和次数
          if (!activity.sets) {
            console.log(`         ⚠️  警告: 缺少组数(sets)字段！`);
          }
          if (!activity.repetitions) {
            console.log(`         ⚠️  警告: 缺少次数(repetitions)字段！`);
          }
          if (!activity.progression) {
            console.log(`         ⚠️  警告: 缺少递进式(progression)字段！`);
          }

          // 验证SVG图解
          if (!activity.drillDiagram) {
            console.log(`         ⚠️  警告: 缺少动作图解(drillDiagram)字段！`);
          }
        });

        // 验证总时长
        const totalDuration = activities.reduce((sum: number, a: any) => sum + (a.duration || 0), 0);
        if (totalDuration > firstSection.duration + 5) {
          console.log(`      ⚠️  警告: 活动总时长${totalDuration}分钟，超过节次时长${firstSection.duration}分钟！`);
        }
      }

      // 验证trainingProgression字段
      if (!plan.trainingProgression) {
        console.log(`   ⚠️  警告: 缺少整体递进关系说明(trainingProgression)！`);
      }

      console.log('\n' + '─'.repeat(80) + '\n');

    } catch (error) {
      console.log(`   ❌ 测试失败: ${error}\n`);
    }
  }
}

// 运行测试
testPlanGeneration().catch(console.error);
