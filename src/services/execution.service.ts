import Docker from "dockerode";
import prisma from "../config/prisma.js";

class ExecutionService {
  private docker: Docker;

  constructor() {
    const isWindows = process.platform === "win32";

    this.docker = new Docker({
      socketPath: isWindows ? "//./pipe/docker_engine" : "/var/run/docker.sock",
    });
  }

  public async runCode(languageId: number, code: string): Promise<string> {
    const language = await prisma.programmingLanguage.findUnique({
      where: { id: languageId },
    });

    if (!language) throw new Error("Unsupported language");
    const fileName = `solution.${language.fileExtension}`;

    const container = await this.docker.createContainer({
      Image: language.dockerImage,
      Cmd: [
        "sh",
        "-c",
        `echo "${code.replace(/"/g, '\\"')}" > ${fileName} && ${language.executionCommand}`,
      ],
      HostConfig: {
        Memory: 128 * 1024 * 1024,
        CpuQuota: 50000,
        AutoRemove: true,
      },
      NetworkDisabled: true,
    });

    await container.start();
    const waitResult = await container.wait();
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
}

export default new ExecutionService();
