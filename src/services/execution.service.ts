import Docker from "dockerode";
import prisma from "../config/prisma.js";
import tar from "tar-stream";
import type { CodeFile } from "../types/models/execution/code-file.model.js";

class ExecutionService {
  private docker: Docker;

  constructor() {
    const isWindows = process.platform === "win32";

    this.docker = new Docker({
      socketPath: isWindows ? "//./pipe/docker_engine" : "/var/run/docker.sock",
    });
  }

  public async runCode(languageId: number, code: string, stdin?: string): Promise<string> {
    const language = await prisma.programmingLanguage.findUnique({
      where: { id: languageId },
    });

    if (!language) throw new Error("Unsupported language");

    const fileName = `solution.${language.fileExtension}`;
    const base64Code = Buffer.from(code).toString("base64");
    const stdinBase64 = stdin ? Buffer.from(stdin).toString("base64") : undefined;

    const files: CodeFile[] = [
      {
        name: fileName,
        content: base64Code,
      },
    ];

    return this.runCodeWithFiles(languageId, files, fileName, stdinBase64);
  }

  public async runCodeWithFiles(
    languageId: number,
    files: CodeFile[],
    entryPoint: string,
    stdinBase64?: string
  ): Promise<string> {
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
        CpuQuota: 50000,
        AutoRemove: true,
      },
      NetworkDisabled: true,
    });

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

    await container.start();

    const timeout = setTimeout(async () => {
      try {
        await container.stop();
      } catch (e) {}
    }, 10000);

    const waitResult = await container.wait();
    clearTimeout(timeout);

    const logs = await container.logs({ stdout: true, stderr: true });
    return this.parseDockerLogs(logs);
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

  public async pullAndPrepImage(imageName: string) {
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
