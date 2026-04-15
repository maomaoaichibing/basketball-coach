// ============================================// 教案生成引擎 - 缓存管理// ============================================
import {
  WARMUP_ACTIVITIES,
  BALL_FAMILIARITY_ACTIVITIES,
  TECHNICAL_ACTIVITIES,
  PHYSICAL_ACTIVITIES,
  TACTICAL_ACTIVITIES,
  GAME_ACTIVITIES,
  COOLDOWN_ACTIVITIES,
  ETIQUETTE_ACTIVITIES,
} from './activities';
import type { TrainingActivity } from './types';

// 缓存接口
interface ActivityCache {
  activities: Map<string, Omit<TrainingActivity, 'id'>[]>;
  lastLoaded: number;
  expiration: number;
}

// 缓存配置
const CACHE_CONFIG = {
  expiration: 3600000, // 1小时过期
};

// 活动类型映射
const ACTIVITY_TYPES = {
  warmup: WARMUP_ACTIVITIES,
  ball_familiarity: BALL_FAMILIARITY_ACTIVITIES,
  technical: TECHNICAL_ACTIVITIES,
  physical: PHYSICAL_ACTIVITIES,
  tactical: TACTICAL_ACTIVITIES,
  game: GAME_ACTIVITIES,
  cooldown: COOLDOWN_ACTIVITIES,
  etiquette: ETIQUETTE_ACTIVITIES,
} as const;

type ActivityType = keyof typeof ACTIVITY_TYPES;

// 缓存实例
let activityCache: ActivityCache | null = null;

// 初始化缓存
function initCache(): void {
  if (!activityCache) {
    activityCache = {
      activities: new Map(),
      lastLoaded: Date.now(),
      expiration: CACHE_CONFIG.expiration,
    };
  }
}

// 检查缓存是否有效
function isCacheValid(): boolean {
  if (!activityCache) return false;
  return Date.now() - activityCache.lastLoaded < activityCache.expiration;
}

// 清除缓存
function clearCache(): void {
  activityCache = null;
}

// 加载活动到缓存
function loadActivitiesToCache(): void {
  initCache();
  const cache = activityCache;
  if (!cache) return;

  Object.entries(ACTIVITY_TYPES).forEach(([type, activities]) => {
    cache.activities.set(type, activities);
  });

  cache.lastLoaded = Date.now();
}

// 按需加载活动
function loadActivitiesByType(type: ActivityType): Omit<TrainingActivity, 'id'>[] {
  initCache();
  if (!activityCache || !isCacheValid()) {
    loadActivitiesToCache();
  }

  const cache = activityCache;
  if (!cache) return ACTIVITY_TYPES[type];

  const cachedActivities = cache.activities.get(type);
  return cachedActivities || ACTIVITY_TYPES[type];
}

// 按需加载多个类型的活动
function loadActivitiesByTypes(types: ActivityType[]): Omit<TrainingActivity, 'id'>[] {
  return types.flatMap((type) => loadActivitiesByType(type));
}

// 缓存管理工具
export const ActivityCacheManager = {
  // 按需加载活动
  getActivities(type: ActivityType): Omit<TrainingActivity, 'id'>[] {
    return loadActivitiesByType(type);
  },

  // 按需加载多个类型的活动
  getActivitiesByTypes(types: ActivityType[]): Omit<TrainingActivity, 'id'>[] {
    return loadActivitiesByTypes(types);
  },

  // 清除缓存
  clear(): void {
    clearCache();
  },

  // 预加载所有活动
  preload(): void {
    loadActivitiesToCache();
  },

  // 检查缓存状态
  getCacheStatus(): {
    isValid: boolean;
    loadedTypes: string[];
    lastLoaded: number | null;
  } {
    if (!activityCache) {
      return {
        isValid: false,
        loadedTypes: [],
        lastLoaded: null,
      };
    }

    return {
      isValid: isCacheValid(),
      loadedTypes: Array.from(activityCache.activities.keys()),
      lastLoaded: activityCache.lastLoaded,
    };
  },
};
