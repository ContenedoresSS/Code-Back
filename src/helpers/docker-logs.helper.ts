const DOCKER_LOG_HEADER_LENGTH = 8;
const DOCKER_LOG_FRAME_LENGTH_OFFSET = 4;

export function parseDockerLogs(logs: Buffer): string {
  let result = "";
  let offset = 0;
  while (offset < logs.length) {
    const length = logs.readUInt32BE(offset + DOCKER_LOG_FRAME_LENGTH_OFFSET);
    result += logs
      .slice(offset + DOCKER_LOG_HEADER_LENGTH, offset + DOCKER_LOG_HEADER_LENGTH + length)
      .toString();
    offset += DOCKER_LOG_HEADER_LENGTH + length;
  }
  return result.trim();
}
