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

function readWindowsProxyFromRegistry() {
  if (process.platform !== "win32") {
    return null;
  }

  try {
    const output = execSync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer',
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );

    const match = output.match(/ProxyServer\s+REG_SZ\s+(.+)/);
    return match ? normalizeProxyServer(match[1].trim()) : null;
  } catch {
    return null;
  }
}

export function getProxyUrl() {
  return (
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.ALL_PROXY ||
    readWindowsProxyFromRegistry()
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
