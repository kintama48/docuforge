"use client";

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
      login: (token, user) => set({ token, user }),
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
      isAuthenticated: () => Boolean(get().token),
    }),
    {
      name: "docuforge-auth",
      storage,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
