import { describe, it, expect, vi } from "vitest";
import {
  ConcurrencyLimiter,
  QueueTimeoutError,
} from "../../src/helpers/concurrency-limiter.helper.js";

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("ConcurrencyLimiter", () => {
  it("runs tasks when under the limit", async () => {
    const limiter = new ConcurrencyLimiter(2, 1000);

    const results = await Promise.all([limiter.run(async () => "a"), limiter.run(async () => "b")]);

    expect(results).toEqual(["a", "b"]);
  });

  it("never runs more tasks than the limit concurrently", async () => {
    const limiter = new ConcurrencyLimiter(2, 1000);
    let active = 0;
    let peak = 0;

    const task = async (): Promise<void> => {
      active++;
      peak = Math.max(peak, active);
      await tick();
      active--;
    };

    await Promise.all([limiter.run(task), limiter.run(task), limiter.run(task), limiter.run(task)]);

    expect(peak).toBe(2);
  });

  it("waits for a slot to free before running queued tasks (FIFO)", async () => {
    const limiter = new ConcurrencyLimiter(1, 1000);
    const order: string[] = [];

    const first = limiter.run(async () => {
      order.push("first-start");
      await tick();
      order.push("first-end");
    });

    const second = limiter.run(async () => {
      order.push("second");
    });

    await Promise.all([first, second]);

    expect(order).toEqual(["first-start", "first-end", "second"]);
  });

  it("rejects queued tasks that exceed the queue timeout", async () => {
    const limiter = new ConcurrencyLimiter(1, 20);
    let release: () => void = () => {};
    const blocker = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = limiter.run(async () => {
      await blocker;
    });

    await tick();

    const second = limiter.run(async () => "done");

    await expect(second).rejects.toBeInstanceOf(QueueTimeoutError);
    release();
    await first;
  });

  it("releases a slot after a task finishes even on failure", async () => {
    const limiter = new ConcurrencyLimiter(1, 1000);

    await expect(limiter.run(async () => Promise.reject(new Error("boom")))).rejects.toThrow(
      "boom"
    );

    const result = await limiter.run(async () => "recovered");
    expect(result).toBe("recovered");
  });
});

describe("QueueTimeoutError", () => {
  it("carries a readable message and name", () => {
    const error = new QueueTimeoutError();
    expect(error.name).toBe("QueueTimeoutError");
    expect(error.message).toContain("saturado");
  });
});
