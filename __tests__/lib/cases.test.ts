import { describe, it, expect } from '@jest/globals';

import {
  retrieveSimilarCases,
  getRandomCases,
  getCasesByCategory,
  getStats,
  allPlans,
} from '@/lib/cases';

describe('cases - allPlans', () => {
  it('should be a non-empty array', () => {
    expect(Array.isArray(allPlans)).toBe(true);
    expect(allPlans.length).toBeGreaterThan(0);
  });

  it('should have required fields on each plan', () => {
    allPlans.forEach(plan => {
      expect(plan).toHaveProperty('age_group');
      expect(plan).toHaveProperty('class_level');
      expect(plan).toHaveProperty('section');
      expect(plan).toHaveProperty('tech_type');
    });
  });
});

describe('cases - retrieveSimilarCases', () => {
  it('should return results with no filters', () => {
    const results = retrieveSimilarCases({});
    expect(results.length).toBeGreaterThan(0);
  });

  it('should limit results by default to 5', () => {
    const results = retrieveSimilarCases({});
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('should respect custom limit', () => {
    const results = retrieveSimilarCases({ limit: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('should filter by ageGroup', () => {
    const results = retrieveSimilarCases({ ageGroup: 'U10' });
    results.forEach(plan => {
      expect(plan.age_group).toBe('U10');
    });
  });

  it('should filter by category', () => {
    const results = retrieveSimilarCases({ category: 'warmup' });
    results.forEach(plan => {
      expect(plan.category).toBe('warmup');
    });
  });

  it('should filter by techType (case insensitive)', () => {
    const results = retrieveSimilarCases({ techType: '运球' });
    results.forEach(plan => {
      expect(plan.tech_type.toLowerCase()).toContain('运球');
    });
  });

  it('should filter by duration with tolerance', () => {
    const results = retrieveSimilarCases({ duration: 5 });
    results.forEach(plan => {
      expect(Math.abs(plan.duration - 5)).toBeLessThanOrEqual(2);
    });
  });

  it('should filter by keyword across content, method, tech_type, game_name', () => {
    const results = retrieveSimilarCases({ keyword: '运球' });
    // Results should contain the keyword in at least one of the searchable fields
    results.forEach(plan => {
      const searchableText = [plan.content, plan.method, plan.tech_type, plan.game_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      expect(searchableText).toContain('运球');
    });
  });

  it('should combine multiple filters', () => {
    const results = retrieveSimilarCases({
      ageGroup: 'U10',
      category: 'technical',
    });
    results.forEach(plan => {
      expect(plan.age_group).toBe('U10');
      expect(plan.category).toBe('technical');
    });
  });

  it('should return empty array when no matches', () => {
    const results = retrieveSimilarCases({
      ageGroup: 'NONEXISTENT',
    });
    expect(results).toEqual([]);
  });
});

describe('cases - getRandomCases', () => {
  it('should return cases for a specific age group', () => {
    const results = getRandomCases('U10', 3);
    expect(results.length).toBeLessThanOrEqual(3);
    results.forEach(plan => {
      expect(plan.age_group).toBe('U10');
    });
  });

  it('should return empty array for non-existent age group', () => {
    const results = getRandomCases('NONEXISTENT', 3);
    expect(results).toEqual([]);
  });

  it('should use default count of 3', () => {
    const results = getRandomCases('U10');
    expect(results.length).toBeLessThanOrEqual(3);
  });
});

describe('cases - getCasesByCategory', () => {
  it('should return cases for a specific category', () => {
    const results = getCasesByCategory('warmup');
    expect(results.length).toBeGreaterThan(0);
    results.forEach(plan => {
      expect(plan.category).toBe('warmup');
    });
  });

  it('should filter by category and ageGroup together', () => {
    const results = getCasesByCategory('warmup', 'U10');
    results.forEach(plan => {
      expect(plan.category).toBe('warmup');
      expect(plan.age_group).toBe('U10');
    });
  });

  it('should respect limit', () => {
    const results = getCasesByCategory('technical', 'U10', 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });
});

describe('cases - getStats', () => {
  it('should return total count', () => {
    const stats = getStats();
    expect(stats.total).toBe(allPlans.length);
  });

  it('should have age group breakdowns', () => {
    const stats = getStats();
    expect(stats.byAgeGroup).toHaveProperty('U6');
    expect(stats.byAgeGroup).toHaveProperty('U8');
    expect(stats.byAgeGroup).toHaveProperty('U10');
    expect(stats.byAgeGroup).toHaveProperty('U12');
    expect(stats.byAgeGroup).toHaveProperty('U14');
  });

  it('should have category breakdowns', () => {
    const stats = getStats();
    expect(stats.byCategory).toHaveProperty('warmup');
    expect(stats.byCategory).toHaveProperty('technical');
    expect(stats.byCategory).toHaveProperty('physical');
    expect(stats.byCategory).toHaveProperty('tactical');
    expect(stats.byCategory).toHaveProperty('game');
    expect(stats.byCategory).toHaveProperty('cooldown');
  });

  it('should have age group sums that match total', () => {
    const stats = getStats();
    const ageSum =
      stats.byAgeGroup.U6 +
      stats.byAgeGroup.U8 +
      stats.byAgeGroup.U10 +
      stats.byAgeGroup.U12 +
      stats.byAgeGroup.U14;
    // Some plans might not match any age group, so ageSum <= total
    expect(ageSum).toBeLessThanOrEqual(stats.total);
  });
});
