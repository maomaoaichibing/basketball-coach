#!/bin/bash

# 测试教案保存API
echo '=== 测试教案保存API ==='

# 创建测试数据
cat > test-plan.json << 'EOF'
{
  "title": "测试教案",
  "date": "2026-04-15",
  "duration": 90,
  "group": "U10",
  "location": "室内",
  "weather": "晴天",
  "theme": "运球+投篮",
  "focusSkills": ["运球", "投篮"],
  "intensity": "medium",
  "skillLevel": "intermediate",
  "sections": [
    {
      "name": "热身",
      "duration": 10,
      "category": "warmup",
      "activities": [
        {
          "name": "慢跑",
          "duration": 5,
          "description": "围绕场地慢跑"
        }
      ]
    }
  ],
  "notes": "测试教案",
  "generatedBy": "rule",
  "playerIds": []
}
EOF

# 测试API
curl -X POST http://localhost:3000/api/plans \
  -H 'Content-Type: application/json' \
  -d @test-plan.json

echo '\n=== 测试完成 ==='

# 清理
rm test-plan.json
