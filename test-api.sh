#!/bin/bash

# 简单测试API
echo '=== 测试API响应 ==='

# 测试根路径
curl -s http://localhost:3000/
echo '\n---'

# 测试API路径
curl -s http://localhost:3000/api/plans
echo '\n---'

echo '=== 测试完成 ==='
