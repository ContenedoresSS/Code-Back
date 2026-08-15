import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { payloadTooLargeErrorHandler } from "../../src/middlewares/body-size-error.middleware.js";

function createPayloadTooLargeError(): unknown {
  const error = new Error("request entity too large");
  const record = error as unknown as Record<string, unknown>;
  record.type = "entity.too.large";
  record.status = 413;
  return error;
}

describe("payloadTooLargeErrorHandler", () => {
  it("responds with 413 JSON for entity.too.large errors", () => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    payloadTooLargeErrorHandler(createPayloadTooLargeError(), {} as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards unrelated errors to next", () => {
    const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    payloadTooLargeErrorHandler(new Error("boom"), {} as Request, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
