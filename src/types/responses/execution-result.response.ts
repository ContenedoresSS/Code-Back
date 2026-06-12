import { ExecutionStatus } from "../enums/execution-status.enum.js";

export interface ExecutionResult {
  status: ExecutionStatus;
  stdout: string;
  stderr: string;
  timeMs: number;
}
