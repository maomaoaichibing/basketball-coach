import { describe, it, expect } from '@jest/globals';

// Test plan-generator utility functions
// We test the exported functions that don't require Prisma
import {
  getAgeGroupInfo,
  getThemeList,
  getActivityCategories,
  getSectionName,
  generateTrainingPlan,
  AgeGroup,
} from '@/lib/plan-generator';

describe('plan-generator - getAgeGroupInfo', () => {
  it('should return config for U6', () => {
    const info = getAgeGroupInfo('U6');
    expect(info.name).toContain('U6');
    expect(info.minAge).toBe(4);
    expect(info.maxAge).toBe(6);
    expect(info.maxDifficulty).toBe(2);
    expect(info.hasEtiquette).toBe(true);
  });

  it('should return config for U10', () => {
    const info = getAgeGroupInfo('U10');
    expect(info.name).toContain('U10');
    expect(info.minAge).toBe(9);
    expect(info.maxAge).toBe(10);
    expect(info.maxDifficulty).toBe(3);
    expect(info.recommendedSkills).toContain('dribbling');
  });

  it('should return config for U14', () => {
    const info = getAgeGroupInfo('U14');
    expect(info.minAge).toBe(13);
    expect(info.maxAge).toBe(14);
    expect(info.maxDifficulty).toBe(5);
    expect(info.tacticalDuration).toBeGreaterThan(0);
  });

  it('should have all 5 age groups', () => {
    const groups: AgeGroup[] = ['U6', 'U8', 'U10', 'U12', 'U14'];
    groups.forEach(group => {
      const info = getAgeGroupInfo(group);
      expect(info).toBeDefined();
      expect(info.name).toContain(group);
    });
  });
});

describe('plan-generator - getThemeList', () => {
  it('should return non-empty theme list', () => {
    const themes = getThemeList();
    expect(themes.length).toBeGreaterThan(0);
  });

  it('should include core training themes', () => {
    const themes = getThemeList();
    expect(themes).toContain('运球基础');
    expect(themes).toContain('传球技术');
    expect(themes).toContain('投篮训练');
    expect(themes).toContain('综合训练');
  });
});

describe('plan-generator - getActivityCategories', () => {
  it('should return all activity categories', () => {
    const categories = getActivityCategories();
    expect(categories).toContain('warmup');
    expect(categories).toContain('ball_familiarity');
    expect(categories).toContain('technical');
    expect(categories).toContain('physical');
    expect(categories).toContain('tactical');
    expect(categories).toContain('game');
    expect(categories).toContain('cooldown');
    expect(categories).toContain('etiquette');
  });
});

describe('plan-generator - getSectionName', () => {
  it('should return Chinese names for all categories', () => {
    expect(getSectionName('warmup')).toBe('热身部分');
    expect(getSectionName('ball_familiarity')).toBe('球性熟悉');
    expect(getSectionName('technical')).toBe('技术训练');
    expect(getSectionName('physical')).toBe('体能素质');
    expect(getSectionName('tactical')).toBe('战术训练');
    expect(getSectionName('game')).toBe('对抗比赛');
    expect(getSectionName('cooldown')).toBe('放松总结');
    expect(getSectionName('etiquette')).toBe('礼仪');
  });

  it('should return the category itself for unknown categories', () => {
    expect(getSectionName('unknown')).toBe('unknown');
  });
});

describe('plan-generator - generateTrainingPlan', () => {
  it('should generate a plan for U10 group', () => {
    const plan = generateTrainingPlan({
      group: 'U10',
      duration: 90,
      location: '室内',
    });

    expect(plan.title).toContain('U10');
    expect(plan.group).toBe('U10');
    expect(plan.location).toBe('室内');
    expect(plan.sections.length).toBeGreaterThan(0);
    expect(plan.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should generate a plan for U6 with game focus', () => {
    const plan = generateTrainingPlan({
      group: 'U6',
      duration: 60,
      location: '室内',
    });

    expect(plan.group).toBe('U6');
    // U6 should have etiquette
    const hasEtiquette = plan.sections.some(s => s.category === 'etiquette');
    expect(hasEtiquette).toBe(true);
  });

  it('should include theme when specified', () => {
    const plan = generateTrainingPlan({
      group: 'U10',
      duration: 90,
      location: '室内',
      theme: '运球基础',
    });

    expect(plan.theme).toBe('运球基础');
    expect(plan.focusSkills).toContain('dribbling');
  });

  it('should generate weather notes for outdoor rainy day', () => {
    const plan = generateTrainingPlan({
      group: 'U10',
      duration: 90,
      location: '室外',
      weather: '雨天',
    });

    expect(plan.notes).toContain('湿滑');
  });

  it('should generate weather notes for outdoor sunny day', () => {
    const plan = generateTrainingPlan({
      group: 'U10',
      duration: 90,
      location: '室外',
      weather: '晴天',
    });

    expect(plan.notes).toContain('防晒');
  });

  it('should include focusSkills when provided', () => {
    const plan = generateTrainingPlan({
      group: 'U10',
      duration: 90,
      location: '室内',
      focusSkills: ['dribbling', 'passing'],
    });

    expect(plan.focusSkills).toContain('dribbling');
    expect(plan.focusSkills).toContain('passing');
  });

  it('should not include tactical training for U6', () => {
    const plan = generateTrainingPlan({
      group: 'U6',
      duration: 60,
      location: '室内',
    });

    const hasTactical = plan.sections.some(s => s.category === 'tactical');
    expect(hasTactical).toBe(false);
  });

  it('should include tactical training for U12', () => {
    const plan = generateTrainingPlan({
      group: 'U12',
      duration: 90,
      location: '室内',
    });

    const hasTactical = plan.sections.some(s => s.category === 'tactical');
    expect(hasTactical).toBe(true);
  });

  it('should include cooldown section', () => {
    const plan = generateTrainingPlan({
      group: 'U10',
      duration: 90,
      location: '室内',
    });

    const hasCooldown = plan.sections.some(s => s.category === 'cooldown');
    expect(hasCooldown).toBe(true);
  });

  it('should have valid intensity (low/medium/high)', () => {
    const plan = generateTrainingPlan({
      group: 'U10',
      duration: 90,
      location: '室内',
    });

    expect(['low', 'medium', 'high']).toContain(plan.intensity);
  });
});
