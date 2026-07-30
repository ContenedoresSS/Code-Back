import { vi } from "vitest";

process.env.JWT_SECRET = "test-secret-minimum-20-chars";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-min-20-chars";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
    },
    invitationCode: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subject: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    activity: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    testCase: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    submission: {
      count: vi.fn(),
      create: vi.fn(),
    },
    programmingLanguage: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../src/config/prisma.js", () => ({
  default: mockPrisma,
}));

export { mockPrisma };
