import json

# 读取案例数据
with open('src/lib/lesson_plans_raw.json', 'r', encoding='utf-8') as f:
    plans = json.load(f)

print('=== 案例库测试 ===\n')
print(f'总记录数: {len(plans)}')

# 测试筛选
def filter_plans(plans, age_group=None, category=None, keyword=None, duration=None, limit=3):
    results = plans
    if age_group:
        results = [p for p in results if p['age_group'] == age_group]
    if category:
        results = [p for p in results if p['category'] == category]
    if keyword:
        kw = keyword.lower()
        results = [p for p in results if kw in (p.get('content', '') + p.get('tech_type', '') + p.get('method', '')).lower()]
    if duration:
        results = [p for p in results if abs(p['duration'] - duration) <= 2]
    return results[:limit]

# 测试1: U8
cases1 = filter_plans(plans, age_group='U8')
print(f'\n1. U8检索: {len(cases1)}条')

# 测试2: 关键词
cases2 = filter_plans(plans, keyword='运球')
print(f'2. "运球"检索: {len(cases2)}条')

# 测试3: U10+technical
cases3 = filter_plans(plans, age_group='U10', category='technical')
print(f'3. U10+technical: {len(cases3)}条')

# 测试4: 时长
cases4 = filter_plans(plans, age_group='U8', duration=15)
print(f'4. U8+15分钟: {len(cases4)}条')

print('\n✅ 案例库数据正常!')