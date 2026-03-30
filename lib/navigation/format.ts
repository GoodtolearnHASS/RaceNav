export function formatDegrees(value: number | null): string {
  if (value == null) return "--";
  return `${Math.round(value)}°`;
}

export function formatNm(value: number | null): string {
  if (value == null) return "--";
  return value.toFixed(2);
}

export function formatKnots(value: number | null): string {
  if (value == null) return "--";
  return value.toFixed(1);
}

export function formatEta(seconds: number | null): string {
  if (seconds == null) return "--";

  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}