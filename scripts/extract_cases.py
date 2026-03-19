import pandas as pd
import json
import re
import os

def clean_text(text):
    if pd.isna(text):
        return ""
    text = str(text)
    text = re.sub(r'\n+', '\n', text)
    return text.strip()

def extract_plan_from_file(filepath, class_level, month):
    """Extract lesson plan data from Excel file"""
    plans = []

    try:
        all_sheets = pd.read_excel(filepath, sheet_name=None, header=None)

        for sheet_name, df in all_sheets.items():
            if df.empty:
                continue

            title = clean_text(df.iloc[0, 0]) if len(df.columns) > 0 else f"{month}教案"

            for idx in range(2, len(df)):
                row = df.iloc[idx]

                # 解析合并单元格格式: "section\npart" 或只有 "part"
                first_cell = clean_text(row.iloc[0]) if len(row) > 0 else ""
                section = ""
                part = ""

                if first_cell:
                    parts = first_cell.split('\n')
                    if len(parts) >= 2:
                        section = parts[0].strip()
                        part = parts[1].strip()
                    elif len(parts) == 1:
                        # 可能是section也可能是part
                        cell = parts[0].strip()
                        if any(x in cell for x in ["部分", "期"]):
                            section = cell
                        else:
                            part = cell

                # 如果section为空，尝试从row[1]获取
                if not section and len(row) > 1:
                    second_cell = clean_text(row.iloc[1])
                    if second_cell and ("部分" in second_cell or "期" in second_cell):
                        section = second_cell

                duration = clean_text(row.iloc[2]) if len(row) > 2 else ""
                tech_type = clean_text(row.iloc[3]) if len(row) > 3 else ""
                content = clean_text(row.iloc[4]) if len(row) > 4 else ""

                # 处理不同的列结构
                if len(row) > 9:
                    game_name = clean_text(row.iloc[6]) if len(row) > 6 else ""
                    form = clean_text(row.iloc[7]) if len(row) > 7 else ""
                    equipment = clean_text(row.iloc[8]) if len(row) > 8 else ""
                    method = clean_text(row.iloc[9]) if len(row) > 9 else ""
                else:
                    game_name = ""
                    form = ""
                    equipment = ""
                    method = ""

                if len(row) > 12:
                    coach_guide = clean_text(row.iloc[12])
                    key_points = clean_text(row.iloc[13]) if len(row) > 13 else ""
                elif len(row) > 10:
                    key_points = clean_text(row.iloc[10]) if len(row) > 10 else ""
                    coach_guide = ""
                else:
                    coach_guide = ""
                    key_points = ""

                if not section and not part and not content:
                    continue

                duration_match = re.search(r'(\d+)', str(duration))
                duration_num = int(duration_match.group(1)) if duration_match else 10

                plans.append({
                    "class_level": class_level,
                    "month": month,
                    "sheet": sheet_name,
                    "section": section,
                    "part": part,
                    "duration": duration_num,
                    "tech_type": tech_type,
                    "content": content,
                    "game_name": game_name,
                    "form": form,
                    "equipment": equipment,
                    "method": method,
                    "coach_guide": coach_guide,
                    "key_points": key_points
                })

    except Exception as e:
        print(f"Error processing {filepath}: {e}")

    return plans

def classify_age_group(class_level):
    """Map class level to age group"""
    mapping = {
        "幼儿班": "U6",
        "小班": "U8",
        "中班": "U10",
        "大班": "U12",
        "中大班": "U12",
        "幼启蒙": "U6",
        "幼基础": "U6",
        "幼提高": "U6",
        "小启蒙": "U8",
        "小基础": "U8",
        "小提高": "U8",
        "中启蒙": "U10",
        "中基础": "U10",
        "中提高": "U10",
        "大启蒙": "U12",
        "大基础": "U12",
        "大提高": "U14"
    }
    return mapping.get(class_level, "U10")

def classify_section(section, tech_type, content):
    """Map section name to category, also consider tech_type"""
    combined = f"{section} {tech_type} {content}"

    if any(x in combined for x in ["准备", "热身", "拉伸", "动态"]):
        return "warmup"
    elif "礼仪" in combined:
        return "etiquette"
    elif any(x in combined for x in ["球性", "运球", "投篮", "防守", "进攻", "技术", "突破", "传球"]):
        return "technical"
    elif any(x in combined for x in ["体能", "素质", "体质", "跑步", "仰卧起坐", "跳"]):
        return "physical"
    elif any(x in combined for x in ["战术", "配合"]):
        return "tactical"
    elif any(x in combined for x in ["对抗", "比赛", "竞技", "游戏"]):
        return "game"
    elif any(x in combined for x in ["放松", "结束", "总结"]):
        return "cooldown"
    return "other"

# Define files to process (30 files total)
downloads_dir = "/Users/zhangxiaohei/Downloads"

files = [
    # 4月教案（4个）
    (f"{downloads_dir}/4月【幼儿班】教案第四周.xlsx", "幼儿班", "4月"),
    (f"{downloads_dir}/4月【小班】教案第四周.xlsx", "小班", "4月"),
    (f"{downloads_dir}/4月【中班】教案第四周.xlsx", "中班", "4月"),
    (f"{downloads_dir}/4月【大班】教案第四周.xlsx", "大班", "4月"),

    # 2024年10月教案（9个）
    (f"{downloads_dir}/2024年十月【幼启蒙】教案.xlsx", "幼启蒙", "2024年10月"),
    (f"{downloads_dir}/2024年十月【幼基础】教案.xlsx", "幼基础", "2024年10月"),
    (f"{downloads_dir}/2024年十月【幼提高】教案.xlsx", "幼提高", "2024年10月"),
    (f"{downloads_dir}/2024年十月【小启蒙】教案.xlsx", "小启蒙", "2024年10月"),
    (f"{downloads_dir}/2024年十月【小基础】教案.xlsx", "小基础", "2024年10月"),
    (f"{downloads_dir}/2024年十月【小提高】教案.xlsx", "小提高", "2024年10月"),
    (f"{downloads_dir}/2024年十月【中启蒙】教案.xlsx", "中启蒙", "2024年10月"),
    (f"{downloads_dir}/2024年十月【中基础】教案.xlsx", "中基础", "2024年10月"),
    (f"{downloads_dir}/2024年十月【中提高】教案.xlsx", "中提高", "2024年10月"),

    # 2024年11月教案（12个）
    (f"{downloads_dir}/2024年十一月【幼启蒙】教案.xlsx", "幼启蒙", "2024年11月"),
    (f"{downloads_dir}/2024年十一月【幼基础】教案.xlsx", "幼基础", "2024年11月"),
    (f"{downloads_dir}/2024年十一月【幼提高】教案.xlsx", "幼提高", "2024年11月"),
    (f"{downloads_dir}/2024年十一月【小启蒙】教案.xlsx", "小启蒙", "2024年11月"),
    (f"{downloads_dir}/2024年十一月【小基础】教案.xlsx", "小基础", "2024年11月"),
    (f"{downloads_dir}/2024年十一月【小提高】教案.xlsx", "小提高", "2024年11月"),
    (f"{downloads_dir}/2024年十一月【中启蒙】教案.xlsx", "中启蒙", "2024年11月"),
    (f"{downloads_dir}/2024年十一月【中基础】教案.xlsx", "中基础", "2024年11月"),
    (f"{downloads_dir}/2024年十一月【中提高】教案.xlsx", "中提高", "2024年11月"),
    (f"{downloads_dir}/2024年十一月【大启蒙】教案.xlsx", "大启蒙", "2024年11月"),
    (f"{downloads_dir}/2024年十一月【大基础】教案.xlsx", "大基础", "2024年11月"),
    (f"{downloads_dir}/2024年十一月【大提高】教案.xlsx", "大提高", "2024年11月"),

    # 2023年暑期教案（3个）
    (f"{downloads_dir}/2023年暑期【幼儿班】教案.xlsx", "幼儿班", "2023年暑期"),
    (f"{downloads_dir}/2023年暑期【小班】教案.xlsx", "小班", "2023年暑期"),
    (f"{downloads_dir}/2023年暑期【中大班】教案.xlsx", "中大班", "2023年暑期"),

    # 2023年暑期训练大纲（1个）
    (f"{downloads_dir}/2023年暑期训练大纲【幼、小、中大】.xlsx", "混合", "2023年暑期"),
]

all_plans = []

for filepath, class_level, month in files:
    if os.path.exists(filepath):
        print(f"Processing: {filepath}")
        plans = extract_plan_from_file(filepath, class_level, month)
        all_plans.extend(plans)
        print(f"  -> {len(plans)} records")

print(f"\nTotal: {len(all_plans)} records")

# Convert to structured format
structured_plans = []
for p in all_plans:
    structured_plans.append({
        "class_level": p["class_level"],
        "age_group": classify_age_group(p["class_level"]),
        "month": p["month"],
        "sheet": p["sheet"],
        "section": p["section"],
        "category": classify_section(p["section"], p["tech_type"], p["content"]),
        "part": p["part"],
        "duration": p["duration"],
        "tech_type": p["tech_type"],
        "content": p["content"],
        "game_name": p["game_name"],
        "form": p["form"],
        "equipment": p["equipment"],
        "method": p["method"],
        "coach_guide": p["coach_guide"],
        "key_points": p["key_points"]
    })

# Save to JSON
output_file = "/Users/zhangxiaohei/WorkBuddy/Claw/basketball-coach/cases/lesson_plans_raw.json"
os.makedirs(os.path.dirname(output_file), exist_ok=True)

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(structured_plans, f, ensure_ascii=False, indent=2)

print(f"\nSaved to: {output_file}")

# Summary statistics
from collections import Counter
age_groups = Counter(p["age_group"] for p in structured_plans)
categories = Counter(p["category"] for p in structured_plans)

print("\nAge groups:")
for k, v in age_groups.most_common():
    print(f"  {k}: {v}")

print("\nCategories:")
for k, v in categories.most_common():
    print(f"  {k}: {v}")

# Show sample
print("\n\nSample record:")
print(json.dumps(structured_plans[0], ensure_ascii=False, indent=2))