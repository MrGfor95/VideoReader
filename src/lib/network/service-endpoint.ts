const DEFAULT_LOCAL_PROCESS_SERVICE_URL = "http://127.0.0.1:8788";

export function getProcessServiceUrl() {
  return (
    process.env.PROCESS_SERVICE_URL ||
    process.env.SUBTITLE_SERVICE_URL ||
    process.env.NEXT_PUBLIC_PROCESS_SERVICE_URL ||
    DEFAULT_LOCAL_PROCESS_SERVICE_URL
  );
}
