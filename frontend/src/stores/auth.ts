"use client";

/**
 * Auth Store - Authentication state management
 *
 * SECURITY NOTE (FE-C2):
 * JWT tokens are stored in localStorage for simplicity and to enable
 * API calls from service workers. This has trade-offs:
 *
 * Pros:
 * - Simple implementation
 * - Works with SSR/hydration
 * - Accessible for API requests
 *
 * Cons:
 * - Vulnerable to XSS attacks (any JS on page can read the token)
 * - Tokens persist until explicitly cleared
 *
 * Mitigations in place:
 * - Content Security Policy (CSP) headers should be configured
 * - No third-party scripts with write access
 * - Token expiry enforced server-side
 *
 * For higher security requirements, consider httpOnly cookies with
 * CSRF protection, but this requires API changes.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
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
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
