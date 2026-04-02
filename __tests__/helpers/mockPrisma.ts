// Prisma Client mock for testing
const mockPrisma = {
  player: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  coach: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  guardian: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  trainingRecord: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  assessment: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  team: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  course: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  enrollment: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

export default mockPrisma;

// Helper to reset all mocks
export function resetPrismaMocks() {
  jest.clearAllMocks();
  return mockPrisma;
}

// Helper to create a mock player
export function createMockPlayer(overrides = {}) {
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
    guardians: [],
    records: [],
    assessments: [],
    _count: {
      records: 10,
      assessments: 3,
    },
    createdAt: '2024-09-01T00:00:00.000Z',
    updatedAt: '2024-09-01T00:00:00.000Z',
    ...overrides,
  };
}

// Helper to create a mock coach
export function createMockCoach(overrides = {}) {
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
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}
