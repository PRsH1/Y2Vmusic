import { spawn } from "node:child_process";
import path from "node:path";

const EXTRA_PATH_DIRS = [
  path.join(
    process.env.LOCALAPPDATA ?? "",
    "Microsoft/WinGet/Packages/yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe",
  ),
  path.join(
    process.env.LOCALAPPDATA ?? "",
    "Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.1-full_build/bin",
  ),
].filter(Boolean);

function getEnhancedPath(): string {
  const existing = process.env.PATH ?? "";
  return [...EXTRA_PATH_DIRS, existing].join(path.delimiter);
}

export class CliError extends Error {
  readonly command: string;
  readonly args: string[];
  readonly exitCode?: number | null;
  readonly stderr?: string;
  readonly code?: string;

  constructor(
    message: string,
    details: {
      command: string;
      args: string[];
      exitCode?: number | null;
      stderr?: string;
      code?: string;
    },
  ) {
    super(message);
    this.name = "CliError";
    this.command = details.command;
    this.args = details.args;
    this.exitCode = details.exitCode;
    this.stderr = details.stderr;
    this.code = details.code;
  }
}

type RunCliOptions = {
  maxStdoutBytes?: number;
  maxStderrBytes?: number;
};

type RunCliResult = {
  stdout: string;
  stderr: string;
};

export function runCli(
  command: string,
  args: string[],
  options: RunCliOptions = {},
): Promise<RunCliResult> {
  const maxStdoutBytes = options.maxStdoutBytes ?? 32 * 1024 * 1024;
  const maxStderrBytes = options.maxStderrBytes ?? 4 * 1024 * 1024;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env: { ...process.env, PATH: getEnhancedPath() },
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let settled = false;

    const fail = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill();
      reject(error);
    };

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxStdoutBytes) {
        fail(
          new CliError(`${command} output is too large.`, {
            command,
            args,
            stderr: Buffer.concat(stderrChunks).toString("utf8"),
          }),
        );
        return;
      }
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes <= maxStderrBytes) {
        stderrChunks.push(chunk);
      }
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      if (settled) {
        return;
      }
      settled = true;
      const message =
        error.code === "ENOENT"
          ? `${command} 명령을 찾을 수 없습니다. PATH에 설치되어 있는지 확인하세요.`
          : `${command} 실행에 실패했습니다.`;
      reject(
        new CliError(message, {
          command,
          args,
          code: error.code,
          stderr: error.message,
        }),
      );
    });

    child.on("close", (exitCode) => {
      if (settled) {
        return;
      }
      settled = true;
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");

      if (exitCode === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new CliError(stderr.trim() || `${command} exited with ${exitCode}.`, {
          command,
          args,
          exitCode,
          stderr,
        }),
      );
    });
  });
}

export function getCliErrorMessage(error: unknown): string {
  if (error instanceof CliError) {
    return error.stderr?.trim() || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "알 수 없는 오류가 발생했습니다.";
}
