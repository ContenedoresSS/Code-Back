import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProgrammingLanguage } from "@prisma/client";
import { ExecutionStatus } from "../../src/types/enums/execution-status.enum.js";
import type { CodeFile } from "../../src/types/models/execution/code-file.model.js";
import { QueueTimeoutError } from "../../src/helpers/concurrency-limiter.helper.js";

const { mockPrisma, mocks } = vi.hoisted(() => {
  process.env.EXECUTION_MEMORY_MB = "256";
  process.env.EXECUTION_CPU_QUOTA = "80000";
  process.env.EXECUTION_PIDS_LIMIT = "50";
  process.env.EXECUTION_TIMEOUT_MS = "20000";
  process.env.EXECUTION_AUTO_REMOVE = "false";
  process.env.EXECUTION_READONLY_ROOTFS = "false";
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

import { ExecutionService } from "../../src/services/execution.service.js";

const executionService = new ExecutionService();

interface FakeContainer {
  putArchive: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  wait: ReturnType<typeof vi.fn>;
  logs: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
}

function createFakeContainer(overrides: Partial<FakeContainer> = {}): FakeContainer {
  return {
    putArchive: vi.fn().mockResolvedValue(undefined),
    start: vi.fn().mockResolvedValue(undefined),
    wait: vi.fn().mockResolvedValue({ StatusCode: 0 }),
    logs: vi.fn().mockResolvedValue(Buffer.alloc(0)),
    remove: vi.fn().mockResolvedValue(undefined),
    kill: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function dockerLogPayload(content: string): Buffer {
  const payload = Buffer.from(content, "utf8");
  const header = Buffer.alloc(8);
  header[0] = 1;
  header.writeUInt32BE(payload.length, 4);
  return Buffer.concat([header, payload]);
}

const mockLanguage: ProgrammingLanguage = {
  id: 1,
  name: "Python",
  editorIdentifier: "python",
  version: "3.12",
  dockerImage: "python:3.12-alpine",
  executionCommand: "python3 ${file}",
  fileExtension: "py",
};

const files: CodeFile[] = [
  { name: "main.py", content: Buffer.from("print('hi')").toString("base64") },
];

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe("ExecutionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getImage.mockReturnValue({ inspect: vi.fn().mockResolvedValue({}) });
    mockPrisma.programmingLanguage.findUnique.mockResolvedValue(mockLanguage);
  });

  describe("runCodeWithFiles", () => {
    it("builds HostConfig from env flags", async () => {
      const container = createFakeContainer();
      mocks.createContainer.mockResolvedValue(container);

      await executionService.runCodeWithFiles(1, files, "main.py", "aW5wdXQ=");

      expect(mocks.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Image: "python:3.12-alpine",
          WorkingDir: "/app",
          Cmd: ["sh", "-c", "python3 main.py < .stdin.txt"],
          NetworkDisabled: true,
          HostConfig: expect.objectContaining({
            Memory: 256 * 1024 * 1024,
            MemorySwap: 256 * 1024 * 1024,
            CpuQuota: 80000,
            PidsLimit: 50,
            AutoRemove: false,
            ReadonlyRootfs: false,
            Tmpfs: {
              "/app": "rw,exec,nosuid,size=64m",
              "/tmp": "rw,noexec,nosuid,size=64m",
            },
          }),
        })
      );
      expect(mocks.createContainer.mock.calls[0]?.[0]?.HostConfig).not.toHaveProperty(
        "SecurityOpt"
      );
    });

    it("logs an error when container cleanup fails instead of silencing it", async () => {
      const container = createFakeContainer();
      container.remove.mockRejectedValue(new Error("remove failed"));
      mocks.createContainer.mockResolvedValue(container);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await executionService.runCodeWithFiles(1, files, "main.py");

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("maps exit code 137 to TIME_LIMIT_EXCEEDED", async () => {
      const container = createFakeContainer({
        wait: vi.fn().mockResolvedValue({ StatusCode: 137 }),
        logs: vi.fn().mockResolvedValue(dockerLogPayload("killed")),
      });
      mocks.createContainer.mockResolvedValue(container);

      const result = await executionService.runCodeWithFiles(1, files, "main.py");

      expect(result.status).toBe(ExecutionStatus.TIME_LIMIT_EXCEEDED);
      expect(result.stdout).toBe("");
    });

    it("maps non-zero exit with error output to COMPILE_ERROR", async () => {
      const container = createFakeContainer({
        wait: vi.fn().mockResolvedValue({ StatusCode: 1 }),
        logs: vi.fn().mockResolvedValue(dockerLogPayload("SyntaxError: invalid syntax")),
      });
      mocks.createContainer.mockResolvedValue(container);

      const result = await executionService.runCodeWithFiles(1, files, "main.py");

      expect(result.status).toBe(ExecutionStatus.COMPILE_ERROR);
      expect(result.stderr).toBe("SyntaxError: invalid syntax");
    });

    it("maps non-zero exit without error keyword to RUNTIME_ERROR", async () => {
      const container = createFakeContainer({
        wait: vi.fn().mockResolvedValue({ StatusCode: 1 }),
        logs: vi.fn().mockResolvedValue(dockerLogPayload("division by zero")),
      });
      mocks.createContainer.mockResolvedValue(container);

      const result = await executionService.runCodeWithFiles(1, files, "main.py");

      expect(result.status).toBe(ExecutionStatus.RUNTIME_ERROR);
    });

    it("maps exit code 0 to SUCCESS with stdout", async () => {
      const container = createFakeContainer({
        logs: vi.fn().mockResolvedValue(dockerLogPayload("Hello")),
      });
      mocks.createContainer.mockResolvedValue(container);

      const result = await executionService.runCodeWithFiles(1, files, "main.py");

      expect(result.status).toBe(ExecutionStatus.SUCCESS);
      expect(result.stdout).toBe("Hello");
    });
  });

  describe("runCode", () => {
    it("performs a single language lookup and builds the solution file", async () => {
      const container = createFakeContainer();
      mocks.createContainer.mockResolvedValue(container);

      await executionService.runCode(1, "print('hi')");

      expect(mockPrisma.programmingLanguage.findUnique).toHaveBeenCalledTimes(1);
      expect(mocks.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({ Cmd: ["sh", "-c", "python3 solution.py"] })
      );
    });
  });

  describe("concurrency limit", () => {
    it("queues executions beyond EXECUTION_MAX_CONCURRENCY until a slot frees", async () => {
      let releaseFirst: () => void = () => {};
      const gateFirst = new Promise<{ StatusCode: number }>((resolve) => {
        releaseFirst = () => resolve({ StatusCode: 0 });
      });

      const containerA = createFakeContainer({ wait: vi.fn().mockReturnValue(gateFirst) });
      const containerB = createFakeContainer();
      mocks.createContainer.mockResolvedValueOnce(containerA).mockResolvedValueOnce(containerB);

      const first = executionService.runCodeWithFiles(1, files, "main.py");
      await flush();

      const second = executionService.runCodeWithFiles(1, files, "main.py");
      await flush();

      expect(mocks.createContainer).toHaveBeenCalledTimes(1);

      releaseFirst();
      await flush();

      await Promise.all([first, second]);
      expect(mocks.createContainer).toHaveBeenCalledTimes(2);
    });

    it("rejects with QueueTimeoutError when the queue wait exceeds the timeout", async () => {
      let releaseBlocker: () => void = () => {};
      const blocker = new Promise<{ StatusCode: number }>((resolve) => {
        releaseBlocker = () => resolve({ StatusCode: 0 });
      });

      const containerA = createFakeContainer({ wait: vi.fn().mockReturnValue(blocker) });
      const containerB = createFakeContainer();
      mocks.createContainer.mockResolvedValueOnce(containerA).mockResolvedValueOnce(containerB);

      const first = executionService.runCodeWithFiles(1, files, "main.py");
      await flush();

      const second = executionService.runCodeWithFiles(1, files, "main.py");

      await expect(second).rejects.toBeInstanceOf(QueueTimeoutError);

      releaseBlocker();
      await first;
    });
  });
});
