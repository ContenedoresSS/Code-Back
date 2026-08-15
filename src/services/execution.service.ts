import Docker from "dockerode";
import prisma from "../config/prisma.js";
import tar from "tar-stream";
import { ENV } from "../config/env.config.js";
import { parseDockerLogs } from "../helpers/docker-logs.helper.js";
import type { ProgrammingLanguage } from "@prisma/client";
import type { CodeFile } from "../types/models/execution/code-file.model.js";
import type { ExecutionResult } from "../types/responses/execution-result.response.js";
import { ExecutionStatus } from "../types/enums/execution-status.enum.js";
import type { IExecutionService } from "./interfaces/execution.service.interface.js";

const WORKING_DIR = "/app";
const STDIN_FILE = ".stdin.txt";
const SIGKILL_EXIT_CODE = 137;

interface ContainerWaitResult {
  StatusCode: number;
}

interface WaitOutcome {
  isTimeout: boolean;
  statusCode: number;
}

class ExecutionService implements IExecutionService {
  private docker: Docker;

  constructor() {
    const isWindows = process.platform === "win32";

    this.docker = new Docker({
      socketPath: isWindows ? "//./pipe/docker_engine" : "/var/run/docker.sock",
    });
  }

  public async runCode(languageId: number, code: string, stdin?: string): Promise<ExecutionResult> {
    const language = await prisma.programmingLanguage.findUnique({
      where: { id: languageId },
    });

    if (!language) throw new Error("Unsupported language");

    const fileName = `solution.${language.fileExtension}`;
    const files: CodeFile[] = [{ name: fileName, content: code }];

    return this.execute(language, files, fileName, stdin ?? "");
  }

  public async runCodeWithFiles(
    languageId: number,
    files: CodeFile[],
    entryPoint: string,
    stdinBase64?: string
  ): Promise<ExecutionResult> {
    const language = await prisma.programmingLanguage.findUnique({
      where: { id: languageId },
    });

    if (!language) throw new Error("Unsupported language");

    await this.ensureImageExists(language.dockerImage);

    return this.execute(language, files, entryPoint, stdinBase64);
  }

  private async execute(
    language: ProgrammingLanguage,
    files: CodeFile[],
    entryPoint: string,
    stdinBase64?: string
  ): Promise<ExecutionResult> {
    const baseCommand = language.executionCommand.replace("${file}", entryPoint);
    const finalCommand = stdinBase64 ? `${baseCommand} < ${STDIN_FILE}` : baseCommand;

    const container = await this.docker.createContainer({
      Image: language.dockerImage,
      WorkingDir: WORKING_DIR,
      Cmd: ["sh", "-c", finalCommand],
      HostConfig: this.buildHostConfig(),
      NetworkDisabled: true,
    });

    try {
      await this.uploadFiles(container, files, stdinBase64);

      const startTime = performance.now();
      await container.start();

      const { isTimeout, statusCode } = await this.waitForContainer(container);

      const timeMs = Math.round(performance.now() - startTime);
      const logs = await container.logs({ stdout: true, stderr: true });
      const outputString = parseDockerLogs(logs);

      return this.buildResult(statusCode, outputString, isTimeout, timeMs);
    } finally {
      try {
        await container.remove({ force: true });
      } catch (error: unknown) {
        console.error("[ExecutionService] Failed to remove container:", error);
      }
    }
  }

  private buildHostConfig(): Docker.HostConfig {
    const memoryBytes = ENV.EXECUTION_MEMORY_MB * 1024 * 1024;

    return {
      Memory: memoryBytes,
      MemorySwap: memoryBytes,
      CpuQuota: ENV.EXECUTION_CPU_QUOTA,
      PidsLimit: ENV.EXECUTION_PIDS_LIMIT,
      AutoRemove: ENV.EXECUTION_AUTO_REMOVE,
      ReadonlyRootfs: ENV.EXECUTION_READONLY_ROOTFS,
      ...(ENV.EXECUTION_NO_NEW_PRIVILEGES ? { SecurityOpt: ["no-new-privileges:true"] } : {}),
    };
  }

  private async uploadFiles(
    container: Docker.Container,
    files: CodeFile[],
    stdinBase64?: string
  ): Promise<void> {
    const pack = tar.pack();

    for (const file of files) {
      const fileBuffer = Buffer.from(file.content, "base64");
      pack.entry({ name: file.name }, fileBuffer);
    }

    if (stdinBase64) {
      const stdinBuffer = Buffer.from(stdinBase64, "base64");
      pack.entry({ name: STDIN_FILE }, stdinBuffer);
    }

    pack.finalize();
    await container.putArchive(pack, { path: WORKING_DIR });
  }

  private async waitForContainer(container: Docker.Container): Promise<WaitOutcome> {
    let isTimeout = false;

    const timeout = setTimeout(() => {
      isTimeout = true;
      container.kill().catch((error: unknown) => {
        console.error("[ExecutionService] Failed to kill container on timeout:", error);
      });
    }, ENV.EXECUTION_TIMEOUT_MS);

    try {
      const waitResult = (await container.wait()) as ContainerWaitResult;
      return { isTimeout, statusCode: waitResult.StatusCode };
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildResult(
    statusCode: number,
    outputString: string,
    isTimeout: boolean,
    timeMs: number
  ): ExecutionResult {
    let status = ExecutionStatus.SUCCESS;
    let stderr = "";

    if (isTimeout || statusCode === SIGKILL_EXIT_CODE) {
      status = ExecutionStatus.TIME_LIMIT_EXCEEDED;
    } else if (statusCode !== 0) {
      stderr = outputString;
      const lowerOutput = outputString.toLowerCase();
      status =
        lowerOutput.includes("error:") || lowerOutput.includes("exception")
          ? ExecutionStatus.COMPILE_ERROR
          : ExecutionStatus.RUNTIME_ERROR;
    }

    return {
      status,
      stdout: statusCode === 0 ? outputString : "",
      stderr,
      timeMs,
    };
  }

  private async ensureImageExists(imageName: string): Promise<void> {
    try {
      await this.docker.getImage(imageName).inspect();
    } catch (error: unknown) {
      if (!this.isImageNotFoundError(error)) throw error;

      await this.pullImage(imageName);
    }
  }

  private isImageNotFoundError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      (error as { statusCode: number }).statusCode === 404
    );
  }

  private async pullImage(imageName: string): Promise<void> {
    const stream = await this.docker.pull(imageName);

    await new Promise<void>((resolve, reject) => {
      this.docker.modem.followProgress(stream, (error: Error | null) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  public async pullAndPrepImage(imageName: string): Promise<void> {
    try {
      await this.pullImage(imageName);
    } catch (error: unknown) {
      console.error(`[Docker Error] Error preparing runner image ${imageName}:`, error);
    }
  }
}

export default new ExecutionService();
