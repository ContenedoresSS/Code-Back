import Docker from "dockerode";
import prisma from "../config/prisma.js";
import tar from "tar-stream";
import type { CodeFile } from "../types/models/execution/code-file.model.js";
import type { ExecutionResult } from "../types/responses/execution-result.response.js";
import { ExecutionStatus } from "../types/enums/execution-status.enum.js";
import type { IExecutionService } from "./interfaces/execution.service.interface.js";

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

    const files: CodeFile[] = [
      {
        name: fileName,
        content: code,
      },
    ];

    return this.runCodeWithFiles(languageId, files, fileName, code);
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

    const baseCommand = language.executionCommand.replace("${file}", entryPoint);
    const finalCommand = stdinBase64 ? `${baseCommand} < .stdin.txt` : baseCommand;

    const executionCommand = language.executionCommand.replace("${file}", entryPoint);
    const container = await this.docker.createContainer({
      Image: language.dockerImage,
      WorkingDir: "/app",
      Cmd: ["sh", "-c", finalCommand],
      HostConfig: {
        Memory: 128 * 1024 * 1024,
        MemorySwap: 128 * 1024 * 1024,
        CpuQuota: 50000,
        PidsLimit: 30,
        AutoRemove: false,
      },
      NetworkDisabled: true,
    });

    try {
      const pack = tar.pack();
      for (const file of files) {
        const fileBuffer = Buffer.from(file.content, "base64");
        pack.entry({ name: file.name }, fileBuffer);
      }

      if (stdinBase64) {
        const stdinBuffer = Buffer.from(stdinBase64, "base64");
        pack.entry({ name: ".stdin.txt" }, stdinBuffer);
      }

      pack.finalize();
      await container.putArchive(pack, { path: "/app" });

      const startTime = performance.now();
      await container.start();

      let isTimeout = false;
      const timeout = setTimeout(async () => {
        isTimeout = true;
        try {
          await container.stop();
        } catch (e) {}
      }, 10000);

      const waitResult = await container.wait();
      clearTimeout(timeout);
      const timeMs = Math.round(performance.now() - startTime);

      const logs = await container.logs({ stdout: true, stderr: true });
      const outputString = this.parseDockerLogs(logs);

      try {
        await container.remove();
      } catch (e) {}

      let status = ExecutionStatus.SUCCESS;
      let stderr = "";

      // 137 es el código de salida de Linux para SIGKILL
      if (isTimeout || waitResult.StatusCode === 137) {
        status = ExecutionStatus.TIME_LIMIT_EXCEEDED;
      } else if (waitResult.StatusCode !== 0) {
        stderr = outputString;
        const lowerOutput = outputString.toLowerCase();
        status =
          lowerOutput.includes("error:") || lowerOutput.includes("exception")
            ? ExecutionStatus.COMPILE_ERROR
            : ExecutionStatus.RUNTIME_ERROR;
      }

      return {
        status,
        stdout: waitResult.StatusCode === 0 ? outputString : "",
        stderr,
        timeMs,
      };
    } finally {
      try {
        await container.remove({ force: true });
      } catch (e) {}
    }
  }

  private parseDockerLogs(logs: Buffer): string {
    let result = "";
    let offset = 0;
    while (offset < logs.length) {
      const length = logs.readUInt32BE(offset + 4);
      result += logs.slice(offset + 8, offset + 8 + length).toString();
      offset += 8 + length;
    }
    return result.trim();
  }

  private async ensureImageExists(imageName: string): Promise<void> {
    try {
      await this.docker.getImage(imageName).inspect();
    } catch (error: any) {
      if (error.statusCode === 404) {
        await new Promise<void>((resolve, reject) => {
          this.docker.pull(imageName, (err: any, stream: any) => {
            if (err) return reject(err);

            this.docker.modem.followProgress(stream, (err: any) => {
              if (err) return reject(err);
              resolve();
            });
          });
        });
      } else {
        throw error;
      }
    }
  }

  public async pullAndPrepImage(imageName: string): Promise<void> {
    try {
      const stream = await this.docker.pull(imageName);

      await new Promise((resolve, reject) => {
        this.docker.modem.followProgress(stream, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
    } catch (error) {
      console.error(`[Docker Error] Error preparing runner image ${imageName}:`, error);
    }
  }
}

export default new ExecutionService();
