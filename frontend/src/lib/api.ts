"use client";

import { toast } from "sonner";
import { env } from "@/src/config/env";
import { ApiError } from "@/src/lib/api-types";
import { useAuthStore } from "@/src/stores/auth";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

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
    const retryAfter = (error.details as { retryAfter?: number } | undefined)
      ?.retryAfter;
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

class ApiClient {
  constructor(private baseUrl: string) {}

  private async request<T>(method: HttpMethod, path: string, body?: unknown) {
    const token = useAuthStore.getState().token;
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (body !== undefined && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });

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
    const token = useAuthStore.getState().token;
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    headers["Content-Type"] = "application/json";

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const error = await parseError(response);
      handleStatus(response, error);
      throw error;
    }
    return response;
  }
}

export const api = new ApiClient(env.apiUrl);
