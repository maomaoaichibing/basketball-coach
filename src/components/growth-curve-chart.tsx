'use client';

import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

// 能力维度配置
const skillConfig = {
  dribbling: { label: '运球', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
  passing: { label: '传球', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' },
  shooting: { label: '投篮', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
  defending: { label: '防守', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
  physical: { label: '体能', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)' },
  tactical: { label: '战术', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
};

type SkillKey = keyof typeof skillConfig;

type DataPoint = {
  date: string;
  dribbling: number;
  passing: number;
  shooting: number;
  defending: number;
  physical: number;
  tactical: number;
  overall: number;
  notes?: string | null;
  assessor?: string | null;
};

type TrendInfo = {
  change: number;
  trend: 'up' | 'down' | 'stable';
};

type GrowthCurveData = {
  playerId: string;
  dataPoints: DataPoint[];
  trends: Record<SkillKey, TrendInfo>;
  growthRate: Record<SkillKey, number>;
  totalAssessments: number;
  period: {
    start: string;
    end: string;
  };
};

interface GrowthCurveChartProps {
  data: GrowthCurveData;
  height?: number;
  showLegend?: boolean;
}

// 趋势图标
function TrendIcon({ trend, change }: { trend: string; change: number }) {
  if (trend === 'up') {
    return (
      <span className="flex items-center gap-0.5 text-green-600 text-xs">
        <TrendingUp className="w-3 h-3" />
        +{change.toFixed(1)}
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="flex items-center gap-0.5 text-red-600 text-xs">
        <TrendingDown className="w-3 h-3" />
        {change.toFixed(1)}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-gray-500 text-xs">
      <Minus className="w-3 h-3" />
      {change === 0 ? '0' : change.toFixed(1)}
    </span>
  );
}

export function GrowthCurveChart({ data, height = 280, showLegend = true }: GrowthCurveChartProps) {
  const [selectedSkills, setSelectedSkills] = useState<SkillKey[]>(
    Object.keys(skillConfig) as SkillKey[]
  );
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  const { dataPoints, trends } = data;

  // 计算图表尺寸
  const padding = { top: 20, right: 30, bottom: 40, left: 40 };
  const chartWidth = 600;
  const chartHeight = height;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // 计算坐标
  const xScale = useMemo(() => {
    if (dataPoints.length <= 1) return () => padding.left;
    const minX = 0;
    const maxX = dataPoints.length - 1;
    return (index: number) =>
      padding.left + (index / (maxX - minX)) * innerWidth;
  }, [dataPoints.length, innerWidth]);

  const yScale = useMemo(() => {
    const minY = 0;
    const maxY = 10;
    return (value: number) =>
      padding.top + innerHeight - ((value - minY) / (maxY - minY)) * innerHeight;
  }, [innerHeight]);

  // 生成路径
  const generatePath = (key: SkillKey) => {
    if (dataPoints.length === 0) return '';
    return dataPoints
      .map((point, index) => {
        const x = xScale(index);
        const y = yScale(point[key]);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  // 生成区域路径（用于渐变填充）
  const generateAreaPath = (key: SkillKey) => {
    if (dataPoints.length === 0) return '';
    const linePath = generatePath(key);
    const lastX = xScale(dataPoints.length - 1);
    const firstX = xScale(0);
    const bottomY = padding.top + innerHeight;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  // 切换技能显示
  const toggleSkill = (key: SkillKey) => {
    setSelectedSkills((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Y轴刻度
  const yTicks = [0, 2, 4, 6, 8, 10];

  if (dataPoints.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-lg"
        style={{ height }}
      >
        <p className="text-gray-400 text-sm">暂无成长数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 图表 */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto"
          style={{ maxHeight: chartHeight }}
        >
          {/* 背景网格 */}
          <g className="grid">
            {/* 水平网格线 */}
            {yTicks.map((tick) => (
              <line
                key={`grid-y-${tick}`}
                x1={padding.left}
                y1={yScale(tick)}
                x2={chartWidth - padding.right}
                y2={yScale(tick)}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
            ))}
            {/* 垂直网格线 */}
            {dataPoints.map((_, index) => (
              <line
                key={`grid-x-${index}`}
                x1={xScale(index)}
                y1={padding.top}
                x2={xScale(index)}
                y2={chartHeight - padding.bottom}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
            ))}
          </g>

          {/* Y轴 */}
          <g className="y-axis">
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={chartHeight - padding.bottom}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            {yTicks.map((tick) => (
              <g key={`y-tick-${tick}`}>
                <text
                  x={padding.left - 8}
                  y={yScale(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="text-[10px] fill-gray-400"
                >
                  {tick}
                </text>
              </g>
            ))}
          </g>

          {/* X轴 */}
          <g className="x-axis">
            <line
              x1={padding.left}
              y1={chartHeight - padding.bottom}
              x2={chartWidth - padding.right}
              y2={chartHeight - padding.bottom}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            {dataPoints.map((point, index) => (
              <g key={`x-tick-${index}`}>
                <text
                  x={xScale(index)}
                  y={chartHeight - padding.bottom + 15}
                  textAnchor="middle"
                  className="text-[10px] fill-gray-400"
                >
                  {point.date.slice(5)}
                </text>
              </g>
            ))}
          </g>

          {/* 数据区域填充 */}
          {(Object.keys(skillConfig) as SkillKey[]).map((key) =>
            selectedSkills.includes(key) ? (
              <path
                key={`area-${key}`}
                d={generateAreaPath(key)}
                fill={skillConfig[key].bgColor}
                opacity={0.3}
              />
            ) : null
          )}

          {/* 数据线 */}
          {(Object.keys(skillConfig) as SkillKey[]).map((key) =>
            selectedSkills.includes(key) ? (
              <path
                key={`line-${key}`}
                d={generatePath(key)}
                fill="none"
                stroke={skillConfig[key].color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null
          )}

          {/* 数据点 */}
          {(Object.keys(skillConfig) as SkillKey[]).map((key) =>
            selectedSkills.includes(key)
              ? dataPoints.map((point, index) => (
                  <circle
                    key={`point-${key}-${index}`}
                    cx={xScale(index)}
                    cy={yScale(point[key])}
                    r="3"
                    fill={skillConfig[key].color}
                    stroke="white"
                    strokeWidth="1.5"
                    className="cursor-pointer hover:r-4 transition-all"
                    onMouseEnter={() => setHoveredPoint(point)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))
              : null
          )}
        </svg>

        {/* 悬停提示 */}
        {hoveredPoint && (
          <div className="absolute top-2 right-2 bg-white rounded-lg shadow-lg border border-gray-100 p-3 text-xs z-10">
            <div className="flex items-center gap-1 text-gray-500 mb-2">
              <Calendar className="w-3 h-3" />
              {hoveredPoint.date}
            </div>
            <div className="space-y-1">
              {(Object.keys(skillConfig) as SkillKey[]).map((key) =>
                selectedSkills.includes(key) ? (
                  <div key={key} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: skillConfig[key].color }}
                    />
                    <span className="text-gray-600">{skillConfig[key].label}:</span>
                    <span className="font-medium">{hoveredPoint[key]}</span>
                  </div>
                ) : null
              )}
            </div>
            {hoveredPoint.notes && (
              <div className="mt-2 pt-2 border-t border-gray-100 text-gray-500 italic">
                {hoveredPoint.notes}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 图例和趋势 */}
      {showLegend && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {(Object.keys(skillConfig) as SkillKey[]).map((key) => {
            const isSelected = selectedSkills.includes(key);
            const trend = trends[key];
            return (
              <button
                key={key}
                onClick={() => toggleSkill(key)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-white border-gray-200 shadow-sm'
                    : 'bg-gray-50 border-transparent opacity-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: skillConfig[key].color }}
                  />
                  <span className="text-xs font-medium text-gray-700">
                    {skillConfig[key].label}
                  </span>
                </div>
                {trend && <TrendIcon trend={trend.trend} change={trend.change} />}
              </button>
            );
          })}
        </div>
      )}

      {/* 统计信息 */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span>
          统计周期: {data.period.start} ~ {data.period.end}
        </span>
        <span>评估次数: {data.totalAssessments} 次</span>
      </div>
    </div>
  );
}

// 简化的成长曲线卡片（用于展示）
export function GrowthCurveCard({ data }: { data: GrowthCurveData }) {
  const { growthRate, trends } = data;

  // 找出进步最快的技能
  const fastestSkill = (Object.keys(growthRate) as SkillKey[]).reduce((a, b) =>
    growthRate[a] > growthRate[b] ? a : b
  );

  // 找出需要关注的技能
  const slowestSkill = (Object.keys(growthRate) as SkillKey[]).reduce((a, b) =>
    growthRate[a] < growthRate[b] ? a : b
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">成长曲线</h3>
        <span className="text-xs text-gray-500">
          {data.period.start} ~ {data.period.end}
        </span>
      </div>

      <GrowthCurveChart data={data} height={200} showLegend={true} />

      {/* 成长洞察 */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-xs text-green-600 mb-1">进步最快</div>
          <div className="font-medium text-green-700">
            {skillConfig[fastestSkill].label}
          </div>
          <div className="text-xs text-green-600 mt-0.5">
            +{growthRate[fastestSkill].toFixed(2)} 分/月
          </div>
        </div>
        <div className="bg-orange-50 rounded-lg p-3">
          <div className="text-xs text-orange-600 mb-1">需要关注</div>
          <div className="font-medium text-orange-700">
            {skillConfig[slowestSkill].label}
          </div>
          <div className="text-xs text-orange-600 mt-0.5">
            {growthRate[slowestSkill] >= 0 ? '+' : ''}
            {growthRate[slowestSkill].toFixed(2)} 分/月
          </div>
        </div>
      </div>
    </div>
  );
}
