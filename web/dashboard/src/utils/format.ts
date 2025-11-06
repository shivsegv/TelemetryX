const GIGABYTE = 1024 ** 3;
const MEGABYTE = 1024 ** 2;
const KILOBYTE = 1024;

export function formatBytes(value: number, fractionDigits = 1): string {
  if (value >= GIGABYTE) {
    return `${(value / GIGABYTE).toFixed(fractionDigits)} GB`;
  }
  if (value >= MEGABYTE) {
    return `${(value / MEGABYTE).toFixed(fractionDigits)} MB`;
  }
  if (value >= KILOBYTE) {
    return `${(value / KILOBYTE).toFixed(fractionDigits)} KB`;
  }
  return `${value} B`;
}

export function formatPercent(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  return `${Math.max(value, 0).toFixed(fractionDigits)}%`;
}

export function formatRate(value: number): string {
  if (value >= 1024 ** 2) {
    return `${(value / (1024 ** 2)).toFixed(2)} MB/s`;
  }
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB/s`;
  }
  return `${value.toFixed(0)} B/s`;
}

export function formatShortTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatLoad(value: number): string {
  if (!Number.isFinite(value)) {
    return "0.00";
  }
  return value.toFixed(2);
}
