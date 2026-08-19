import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProgrammingLanguage } from "@prisma/client";
import type { CodeFile } from "../../src/types/models/execution/code-file.model.js";

const { mockPrisma, mocks } = vi.hoisted(() => {
  process.env.EXECUTION_MEMORY_MB = "256";
  process.env.EXECUTION_CPU_QUOTA = "80000";
  process.env.EXECUTION_PIDS_LIMIT = "50";
  process.env.EXECUTION_TIMEOUT_MS = "20000";
  process.env.EXECUTION_AUTO_REMOVE = "false";
  process.env.EXECUTION_READONLY_ROOTFS = "true";
  process.env.EXECUTION_NO_NEW_PRIVILEGES = "false";
  process.env.EXECUTION_MAX_CONCURRENCY = "1";
  process.env.EXECUTION_QUEUE_TIMEOUT_MS = "200";

  return {
    mockPrisma: {
      programmingLanguage: {
        findUnique: vi.fn(),
      },
    },
    mocks: {
      createContainer: vi.fn(),
      getImage: vi.fn(),
      pull: vi.fn(),
      followProgress: vi.fn(),
    },
  };
});

vi.mock("../../src/config/prisma.js", () => ({
  default: mockPrisma,
}));

vi.mock("dockerode", () => ({
  default: class {
    constructor(_options?: unknown) {}
    createContainer = mocks.createContainer;
    getImage = mocks.getImage;
    pull = mocks.pull;
    modem = { followProgress: mocks.followProgress };
  },
}));

import executionService from "../../src/services/execution.service.js";

const mockLanguage: ProgrammingLanguage = {
  id: 1,
  name: "C++",
  editorIdentifier: "cpp",
  version: "13.2",
  dockerImage: "gcc:13.2",
  executionCommand: "g++ -o solution ${file} && ./solution",
  fileExtension: "cpp",
};

const files: CodeFile[] = [
  { name: "main.cpp", content: Buffer.from("int main(){return 0;}").toString("base64") },
];

describe("ExecutionService (read-only rootfs)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getImage.mockReturnValue({ inspect: vi.fn().mockResolvedValue({}) });
    mockPrisma.programmingLanguage.findUnique.mockResolvedValue(mockLanguage);
  });

  it("keeps the rootfs read-only and mounts writable tmpfs for /app and /tmp", async () => {
    mocks.createContainer.mockResolvedValue({
      putArchive: vi.fn().mockResolvedValue(undefined),
      start: vi.fn().mockResolvedValue(undefined),
      wait: vi.fn().mockResolvedValue({ StatusCode: 0 }),
      logs: vi.fn().mockResolvedValue(Buffer.alloc(0)),
      remove: vi.fn().mockResolvedValue(undefined),
      kill: vi.fn().mockResolvedValue(undefined),
    });

    await executionService.runCodeWithFiles(1, files, "main.cpp");

    expect(mocks.createContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        HostConfig: expect.objectContaining({
          ReadonlyRootfs: true,
          Tmpfs: {
            "/app": "rw,exec,nosuid,size=64m",
            "/tmp": "rw,noexec,nosuid,size=64m",
          },
        }),
      })
    );
  });
});
