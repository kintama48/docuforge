import { clsx } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: Array<string | undefined | null | false>) {
  return twMerge(clsx(inputs));
}

// FE-m2 fix: Explicit epoch-milliseconds detection.
// Timestamps from the API are always in milliseconds (Date.now()).
// This handles the edge case of seconds-based timestamps (10 digits) vs
// milliseconds (13 digits) without a magic cutoff year.
export function formatDate(timestamp: number) {
  if (!timestamp) return "—";
  // 10-digit numbers are seconds, 13-digit numbers are milliseconds
  const value = String(Math.floor(timestamp)).length <= 10
    ? timestamp * 1000
    : timestamp;
  return format(new Date(value), "MMM d, yyyy");
}

export function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
