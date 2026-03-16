"use client";

import { toast } from "sonner";
import { env } from "@/src/config/env";
import { ApiError } from "@/src/lib/api-types";
import { useAuthStore } from "@/src/stores/auth";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
const REFRESH_PATH = "/v1/auth/refresh";
const AUTH_PATHS_WITHOUT_REFRESH = new Set([
  "/v1/auth/login",
  "/v1/auth/register",
  "/v1/auth/verify-email",
  "/v1/auth/resend-verification",
  "/v1/auth/2fa/verify",
  "/v1/auth/2fa/resend",
  "/v1/auth/oauth/exchange",
  "/v1/auth/logout",
  REFRESH_PATH,
]);

function isLoginVerificationChallenge(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const payload = error as Record<string, unknown>;
  return (
    payload.verification_required === true &&
    typeof payload.challenge_id === "string"
  );
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const data = (await response.json()) as ApiError;
    return data;
  } catch {
    return {
      error: "unknown_error",
      message: response.statusText || "Unknown error",
    };
  }
}

function handleStatus(response: Response, error: ApiError) {
  if (response.status === 401) {
    useAuthStore.getState().logout();
    return;
  }
  if (response.status === 402) {
    toast.error("Upgrade required to continue.");
  }
  if (response.status === 429) {
    const details = error.details as
      | {
          retryAfter?: number;
          current_plan?: string;
          suggested_plan?: string;
          upgrade_url?: string;
        }
      | undefined;
    const retryAfter = details?.retryAfter;
    const suggestedPlan = details?.suggested_plan;
    if (details?.upgrade_url && suggestedPlan) {
      toast.error(
        `Rate limited for current throughput. Upgrade to ${suggestedPlan} for higher limits.`
      );
      return;
    }
    toast.error(
      retryAfter
        ? `Rate limited — try again in ${retryAfter} seconds.`
        : "Rate limited — try again shortly."
    );
  }
  if (response.status >= 500) {
    toast.error("Something went wrong. Please retry.");
  }
}

function canAttemptRefresh(path: string): boolean {
  return !AUTH_PATHS_WITHOUT_REFRESH.has(path);
}

function hasAuthPayload(data: unknown): data is {
  token: string;
  user: {
    id: string;
    email: string;
    plan: "free" | "dev" | "starter" | "pro";
  };
} {
  if (!data || typeof data !== "object") return false;
  const payload = data as Record<string, unknown>;
  const user = payload.user as Record<string, unknown> | undefined;
  const plan = user?.plan;
  return (
    typeof payload.token === "string" &&
    !!user &&
    typeof user.id === "string" &&
    typeof user.email === "string" &&
    (plan === "free" || plan === "dev" || plan === "starter" || plan === "pro")
  );
}

function resolveClientLocaleHeader(): string | null {
  if (typeof document === "undefined") return null;

  const htmlLang = document.documentElement.lang.trim();
  if (htmlLang.length > 0) return htmlLang;

  const localeCookie = document.cookie.match(/(?:^|;\s*)docuforge-locale=([^;]+)/);
  if (!localeCookie?.[1]) return null;

  try {
    return decodeURIComponent(localeCookie[1]);
  } catch {
    return localeCookie[1];
  }
}

function toConsolePath(path: string): string {
  if (!path.startsWith("/v1/")) return path;

  // Consumer/public endpoints remain on /v1.
  if (path === "/v1/render") return path;
  if (path === "/v1/render/image") return path;
  if (path === "/v1/render/secure") return path;
  if (path.startsWith("/v1/render/public/")) return path;
  if (path === "/v1/billing/webhook") return path;

  // Dashboard preview endpoints move to /console.
  if (path.startsWith("/v1/render/preview")) {
    return `/console${path.slice(3)}`;
  }

  if (path.startsWith("/v1/auth/")) return `/console${path.slice(3)}`;
  if (path.startsWith("/v1/templates")) return `/console${path.slice(3)}`;
  if (path.startsWith("/v1/assets")) return `/console${path.slice(3)}`;
  if (path.startsWith("/v1/ai/")) return `/console${path.slice(3)}`;
  if (path.startsWith("/v1/usage")) return `/console${path.slice(3)}`;
  if (path.startsWith("/v1/billing/checkout")) return `/console${path.slice(3)}`;
  if (path.startsWith("/v1/webhooks")) return `/console${path.slice(3)}`;

  return path;
}

class ApiClient {
  private refreshPromise: Promise<boolean> | null = null;

  constructor(private baseUrl: string) {}

  private async send(
    method: HttpMethod,
    resolvedPath: string,
    body?: unknown,
    signal?: AbortSignal
  ): Promise<Response> {
    const token = useAuthStore.getState().token;
    const headers: HeadersInit = {};

    const locale = resolveClientLocaleHeader();
    if (locale) {
      headers["X-Docuforge-Locale"] = locale;
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (body !== undefined && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    return fetch(`${this.baseUrl}${resolvedPath}`, {
      method,
      headers,
      credentials: "include",
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
      signal,
    });
  }

  private async refreshSession(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const response = await fetch(`${this.baseUrl}${toConsolePath(REFRESH_PATH)}`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        return false;
      }

      const data = (await response.json().catch(() => null)) as unknown;
      if (!hasAuthPayload(data)) {
        return false;
      }

      useAuthStore.getState().login(data.token, data.user);
      return true;
    })();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async request<T>(method: HttpMethod, path: string, body?: unknown) {
    const resolvedPath = toConsolePath(path);
    let response = await this.send(method, resolvedPath, body);

    if (
      response.status === 401 &&
      canAttemptRefresh(path) &&
      (await this.refreshSession())
    ) {
      response = await this.send(method, resolvedPath, body);
    }

    if (!response.ok) {
      const error = await parseError(response);
      // Auth hardening flow: login may return 403 with a verification challenge.
      // This is a successful next-step response, not a terminal API error.
      if (
        path === "/v1/auth/login" &&
        response.status === 403 &&
        isLoginVerificationChallenge(error)
      ) {
        return error as T;
      }
      handleStatus(response, error);
      throw error;
    }

    if (response.status === 204) {
      return null as T;
    }
    return (await response.json()) as T;
  }

  get<T>(path: string) {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>("POST", path, body);
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, body);
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>("PATCH", path, body);
  }

  delete<T>(path: string) {
    return this.request<T>("DELETE", path);
  }

  async postRaw(path: string, body: unknown, signal?: AbortSignal) {
    const resolvedPath = toConsolePath(path);
    let response = await this.send("POST", resolvedPath, body, signal);

    if (
      response.status === 401 &&
      canAttemptRefresh(path) &&
      (await this.refreshSession())
    ) {
      response = await this.send("POST", resolvedPath, body, signal);
    }

    if (!response.ok) {
      const error = await parseError(response);
      handleStatus(response, error);
      throw error;
    }
    return response;
  }
}

export const api = new ApiClient(env.apiUrl);
