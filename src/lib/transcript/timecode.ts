export function parseTimestamp(value: string) {
  const normalized = value.replace(",", ".");
  const parts = normalized.split(":").map((item) => Number.parseFloat(item));

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return parts[0] ?? 0;
}

export function formatTimecode(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(wholeSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((wholeSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const remaining = (wholeSeconds % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}:${remaining}`;
}
