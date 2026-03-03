"use client";

/**
 * Auth Store - Authentication state management
 *
 * SECURITY NOTE (FE-C2):
 * Web authentication relies on httpOnly session cookies set by the API.
 * We keep token state in-memory only for compatibility paths and persist
 * only minimal non-sensitive user profile data.
 * This avoids localStorage token persistence, which is XSS-extractable by design.
 *
 * Pros:
 * - Simple implementation
 * - Works with SSR/hydration
 * - JWT is no longer persisted in browser storage
 *
 * Cons:
 * - Cookie auth requires strict CORS + same-site policy alignment
 *
 * Mitigations in place:
 * - Content Security Policy (CSP) headers should be configured
 * - No third-party scripts with write access
 * - Token expiry and cookie attributes enforced server-side
 *
 * CSRF defenses should be kept enabled server-side for cookie-authenticated
 * mutations (trusted-origin checks + same-site cookie policy).
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { env } from "@/src/config/env";
import type { User } from "@/src/lib/api-types";

type AuthState = {
  token: string | null;
  user: User | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  isAuthenticated: () => boolean;
};

function decodeBase64Url(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

    if (typeof atob === "function") {
      return atob(padded);
    }
    if (typeof Buffer !== "undefined") {
      return Buffer.from(padded, "base64").toString("utf-8");
    }
    return null;
  } catch {
    return null;
  }
}

export function getJwtExpiryMs(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payloadRaw = decodeBase64Url(parts[1]);
  if (!payloadRaw) return null;

  try {
    const payload = JSON.parse(payloadRaw) as { exp?: unknown };
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
      return null;
    }
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, nowMs = Date.now()): boolean {
  const expiryMs = getJwtExpiryMs(token);
  if (expiryMs === null) return false;
  return nowMs >= expiryMs;
}

const storage =
  typeof window !== "undefined"
    ? createJSONStorage(() => localStorage)
    : undefined;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      hasHydrated: process.env.NODE_ENV === "test",
      setHasHydrated: (value) => set({ hasHydrated: value }),
      login: (token, user) => {
        if (isJwtExpired(token)) {
          set({ token: null, user: null });
          return;
        }
        set({ token, user });
      },
      logout: () => {
        set({ token: null, user: null });
        if (typeof window !== "undefined") {
          void fetch(`${env.apiUrl}/v1/auth/logout`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }).catch(() => {
            // Best effort cookie cleanup; local state is already cleared.
          });
          localStorage.removeItem("docuforge-auth");
          if (process.env.NODE_ENV !== "test") {
            window.location.href = "/login";
          }
        }
      },
      updateUser: (user) => set({ user }),
      isAuthenticated: () => {
        const token = get().token;
        if (!token) return false;
        if (isJwtExpired(token)) {
          set({ token: null, user: null });
          return false;
        }
        return true;
      },
    }),
    {
      name: "docuforge-auth",
      storage,
      onRehydrateStorage: () => (state) => {
        if (state?.token && isJwtExpired(state.token)) {
          state.logout();
        }
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({ user: state.user }),
    }
  )
);
