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

  it("enables AutoRemove by default", () => {
    expect(ENV.EXECUTION_AUTO_REMOVE).toBe(true);
  });

  it("enables read-only rootfs by default", () => {
    expect(ENV.EXECUTION_READONLY_ROOTFS).toBe(true);
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
});
