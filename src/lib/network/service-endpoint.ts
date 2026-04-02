const DEFAULT_LOCAL_PROCESS_SERVICE_URL = "http://127.0.0.1:8788";

type ProcessServiceMode = "auto" | "local" | "remote";

function normalizeMode(value?: string): ProcessServiceMode {
  if (value === "local" || value === "remote") {
    return value;
  }

  return "auto";
}

function resolveAutoMode(): Exclude<ProcessServiceMode, "auto"> {
  return process.env.NODE_ENV === "production" ? "remote" : "local";
}

function getConfiguredRemoteProcessServiceUrl() {
  return (
    process.env.PROCESS_SERVICE_URL ||
    process.env.SUBTITLE_SERVICE_URL ||
    process.env.NEXT_PUBLIC_PROCESS_SERVICE_URL ||
    ""
  ).trim();
}

function getConfiguredLocalProcessServiceUrl() {
  return (
    process.env.LOCAL_PROCESS_SERVICE_URL ||
    process.env.LOCAL_SUBTITLE_SERVICE_URL ||
    DEFAULT_LOCAL_PROCESS_SERVICE_URL
  ).trim();
}

export function getProcessServiceMode() {
  const configuredMode = normalizeMode(process.env.PROCESS_SERVICE_MODE);
  return configuredMode === "auto" ? resolveAutoMode() : configuredMode;
}

export function getProcessServiceUrl() {
  const mode = getProcessServiceMode();

  if (mode === "local") {
    return getConfiguredLocalProcessServiceUrl();
  }

  const remoteUrl = getConfiguredRemoteProcessServiceUrl();

  if (!remoteUrl) {
    throw new Error(
      "当前运行在远端字幕服务模式，但未配置 PROCESS_SERVICE_URL。开发环境可设置 PROCESS_SERVICE_MODE=local。",
    );
  }

  return remoteUrl;
}
