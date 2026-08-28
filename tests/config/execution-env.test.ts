import { describe, it, expect, vi } from "vitest";

vi.hoisted(() => {
  for (const key of [
    "EXECUTION_MEMORY_MB",
    "EXECUTION_CPU_QUOTA",
    "EXECUTION_PIDS_LIMIT",
    "EXECUTION_TIMEOUT_MS",
    "EXECUTION_AUTO_REMOVE",
    "EXECUTION_READONLY_ROOTFS",
    "EXECUTION_NO_NEW_PRIVILEGES",
    "EXECUTION_MAX_CONCURRENCY",
    "EXECUTION_QUEUE_TIMEOUT_MS",
    "MAX_REQUEST_BODY",
    "EXECUTION_MAX_CODE_BYTES",
    "EXECUTION_MAX_STDIN_BYTES",
  ]) {
    delete process.env[key];
  }
});

import { ENV } from "../../src/config/env.config.js";

describe("execution sandbox env defaults", () => {
  it("defaults memory to 128 MB", () => {
    expect(ENV.EXECUTION_MEMORY_MB).toBe(128);
  });

  it("defaults cpu quota to 50000", () => {
    expect(ENV.EXECUTION_CPU_QUOTA).toBe(50000);
  });

  it("defaults pids limit to 30", () => {
    expect(ENV.EXECUTION_PIDS_LIMIT).toBe(30);
  });

  it("defaults timeout to 10000 ms", () => {
    expect(ENV.EXECUTION_TIMEOUT_MS).toBe(10000);
  });

  it("disables AutoRemove by default (cleanup is explicit in finally)", () => {
    expect(ENV.EXECUTION_AUTO_REMOVE).toBe(false);
  });

  it("disables read-only rootfs by default (breaks interpreters writing to rootfs)", () => {
    expect(ENV.EXECUTION_READONLY_ROOTFS).toBe(false);
  });

  it("enables no-new-privileges by default", () => {
    expect(ENV.EXECUTION_NO_NEW_PRIVILEGES).toBe(true);
  });

  it("defaults max concurrency to 5", () => {
    expect(ENV.EXECUTION_MAX_CONCURRENCY).toBe(5);
  });

  it("defaults queue timeout to 30000 ms", () => {
    expect(ENV.EXECUTION_QUEUE_TIMEOUT_MS).toBe(30000);
  });

  it("defaults request body limit to 1mb", () => {
    expect(ENV.MAX_REQUEST_BODY).toBe("1mb");
  });

  it("defaults code size limit to 256 KB", () => {
    expect(ENV.EXECUTION_MAX_CODE_BYTES).toBe(262144);
  });

  it("defaults stdin size limit to 64 KB", () => {
    expect(ENV.EXECUTION_MAX_STDIN_BYTES).toBe(65536);
  });
});
