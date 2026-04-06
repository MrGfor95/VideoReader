import { execSync } from "node:child_process";
import { ProxyAgent, setGlobalDispatcher } from "undici";

let proxyAgent: ProxyAgent | null | undefined;
let globalDispatcherInitialized = false;

function normalizeProxyServer(proxyServer: string) {
  const firstSegment = proxyServer
    .split(";")
    .map((item) => item.trim())
    .find(Boolean);

  if (!firstSegment) {
    return null;
  }

  const value = firstSegment.includes("=") ? firstSegment.split("=")[1] : firstSegment;

  if (!value) {
    return null;
  }

  return /^https?:\/\//i.test(value) ? value : `http://${value}`;
}

function readWindowsInternetSettingsProxy() {
  if (process.platform !== "win32") {
    return null;
  }

  try {
    const output = execSync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"',
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );

    const proxyEnabled = output.match(/ProxyEnable\s+REG_DWORD\s+0x1/i);

    if (!proxyEnabled) {
      return null;
    }

    const proxyServer = output.match(/ProxyServer\s+REG_SZ\s+(.+)/i);
    return proxyServer ? normalizeProxyServer(proxyServer[1].trim()) : null;
  } catch {
    return null;
  }
}

function readWindowsWinHttpProxy() {
  if (process.platform !== "win32") {
    return null;
  }

  try {
    const output = execSync("netsh winhttp show proxy", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    if (/Direct access \(no proxy server\)/i.test(output)) {
      return null;
    }

    const match = output.match(/Proxy Server\(s\)\s*:\s*(.+)/i);
    return match ? normalizeProxyServer(match[1].trim()) : null;
  } catch {
    return null;
  }
}

function readWindowsSystemProxy() {
  return readWindowsWinHttpProxy() || readWindowsInternetSettingsProxy();
}

export function getProxyUrl() {
  return (
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.ALL_PROXY ||
    readWindowsSystemProxy()
  );
}

export function getProxyAgent() {
  if (proxyAgent !== undefined) {
    return proxyAgent;
  }

  const proxyUrl = getProxyUrl();
  proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : null;
  return proxyAgent;
}

export function ensureGlobalProxyDispatcher() {
  if (globalDispatcherInitialized) {
    return;
  }

  const agent = getProxyAgent();

  if (agent) {
    setGlobalDispatcher(agent);
  }

  globalDispatcherInitialized = true;
}

export async function fetchWithProxy(input: string | URL, init?: RequestInit) {
  ensureGlobalProxyDispatcher();
  const agent = getProxyAgent();

  return fetch(input, {
    ...init,
    dispatcher: agent ?? undefined,
  } as RequestInit & { dispatcher?: ProxyAgent });
}
