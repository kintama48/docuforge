const SAFE_REDIRECT_BASE = "https://docuforge.local";

function isSafeRedirectPath(value: string): boolean {
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.includes("\\")) return false;
  return true;
}

export function sanitizeAppRedirect(
  candidate: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!candidate) return fallback;
  const normalized = candidate.trim();
  if (!normalized || !isSafeRedirectPath(normalized)) {
    return fallback;
  }

  try {
    const parsed = new URL(normalized, SAFE_REDIRECT_BASE);
    if (parsed.origin !== SAFE_REDIRECT_BASE) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
