// Prisma Client mock for testing
import { jest } from '@jest/globals';

// Use any type for mock functions to avoid strict type checking in tests
type MockFn = jest.Mock<any, any>;

type MockPrismaModel = {
  findMany: MockFn;
  findUnique: MockFn;
  findFirst: MockFn;
  create: MockFn;
  createMany: MockFn;
  update: MockFn;
  delete: MockFn;
  deleteMany: MockFn;
  count: MockFn;
  groupBy: MockFn;
  aggregate: MockFn;
  upsert: MockFn;
};

type MockPrismaClient = {
  player: MockPrismaModel;
  coach: MockPrismaModel;
  guardian: MockPrismaModel;
  playerGoal: MockPrismaModel;
  playerAssessment: MockPrismaModel;
  assessment: MockPrismaModel;
  trainingRecord: MockPrismaModel;
  trainingPlan: MockPrismaModel;
  team: MockPrismaModel;
  course: MockPrismaModel;
  courseEnrollment: MockPrismaModel;
  enrollment: MockPrismaModel;
  campus: MockPrismaModel;
  court: MockPrismaModel;
  schedule: MockPrismaModel;
  booking: MockPrismaModel;
  order: MockPrismaModel;
  orderItem: MockPrismaModel;
  payment: MockPrismaModel;
  checkIn: MockPrismaModel;
  checkInLike: MockPrismaModel;
  leave: MockPrismaModel;
  match: MockPrismaModel;
  matchEvent: MockPrismaModel;
  message: MockPrismaModel;
  notification: MockPrismaModel;
  notificationTemplate: MockPrismaModel;
  growthReport: MockPrismaModel;
  abilityAnalysis: MockPrismaModel;
  trainingRecommend: MockPrismaModel;
  teamRecommendation: MockPrismaModel;
  $connect: MockFn;
  $disconnect: MockFn;
  $transaction: MockFn;
};

const m = (name: string): MockPrismaModel => ({
  findMany: jest.fn<any, any>(),
  findUnique: jest.fn<any, any>(),
  findFirst: jest.fn<any, any>(),
  create: jest.fn<any, any>(),
  createMany: jest.fn<any, any>(),
  update: jest.fn<any, any>(),
  delete: jest.fn<any, any>(),
  deleteMany: jest.fn<any, any>(),
  count: jest.fn<any, any>(),
  groupBy: jest.fn<any, any>(),
  aggregate: jest.fn<any, any>(),
  upsert: jest.fn<any, any>(),
});

const mockPrisma: MockPrismaClient = {
  player: m('player'),
  coach: m('coach'),
  guardian: m('guardian'),
  playerGoal: m('playerGoal'),
  playerAssessment: m('playerAssessment'),
  assessment: m('assessment'),
  trainingRecord: m('trainingRecord'),
  trainingPlan: m('trainingPlan'),
  team: m('team'),
  course: m('course'),
  courseEnrollment: m('courseEnrollment'),
  enrollment: m('enrollment'),
  campus: m('campus'),
  court: m('court'),
  schedule: m('schedule'),
  booking: m('booking'),
  order: m('order'),
  orderItem: m('orderItem'),
  payment: m('payment'),
  checkIn: m('checkIn'),
  checkInLike: m('checkInLike'),
  leave: m('leave'),
  match: m('match'),
  matchEvent: m('matchEvent'),
  message: m('message'),
  notification: m('notification'),
  notificationTemplate: m('notificationTemplate'),
  growthReport: m('growthReport'),
  abilityAnalysis: m('abilityAnalysis'),
  trainingRecommend: m('trainingRecommend'),
  teamRecommendation: m('teamRecommendation'),
  $connect: jest.fn<any, any>(),
  $disconnect: jest.fn<any, any>(),
  $transaction: jest.fn<any, any>(),
};

export default mockPrisma;
export { mockPrisma as prisma };

// Helper to reset all mocks
export function resetPrismaMocks() {
  jest.clearAllMocks();
  return mockPrisma;
}

// Helper to create a mock player
export function createMockPlayer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'player-1',
    name: '测试学员',
    birthDate: '2016-03-15T00:00:00.000Z',
    gender: 'male',
    group: 'U10',
    height: 135,
    weight: 30,
    status: 'training',
    school: '测试小学',
    position: 'PG',
    parentName: '测试家长',
    parentPhone: '13800138000',
    parentWechat: 'test_wechat',
    enrollDate: '2024-09-01T00:00:00.000Z',
    tags: '[]',
    injuries: '[]',
    dribbling: 5,
    passing: 5,
    shooting: 5,
    defending: 5,
    physical: 5,
    tactical: 5,
    teamId: null,
    team: null,
    campusId: null,
    guardians: [],
    records: [],
    assessments: [],
    enrollments: [],
    courses: [],
    _count: { records: 10, assessments: 3 },
    createdAt: '2024-09-01T00:00:00.000Z',
    updatedAt: '2024-09-01T00:00:00.000Z',
    ...overrides,
  };
}

// Helper to create a mock coach
export function createMockCoach(overrides: Record<string, unknown> = {}) {
  return {
    id: 'coach-1',
    email: 'test@coach.com',
    name: '测试教练',
    password: '$2a$10$hashedpassword',
    role: 'head_coach',
    phone: '13900139000',
    campusId: 'campus-1',
    status: 'active',
    avatar: null,
    specialties: '[]',
    campus: { id: 'campus-1', name: '测试校区' },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// Helper to create auth response
export function createAuthSuccess(coach = createMockCoach()) {
  return {
    success: true as const,
    coach,
    response: null as unknown as never,
  };
}
