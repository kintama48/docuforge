import { describe, expect, it, beforeEach } from "vitest";
import {
  getJwtExpiryMs,
  isJwtExpired,
  useAuthStore,
} from "@/src/stores/auth";

function buildUnsignedJwt(expUnix: number) {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ exp: expUnix })}.signature`;
}

describe("auth store", () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
    localStorage.clear();
  });

  it("login sets token and user", () => {
    useAuthStore.getState().login("token", {
      id: "usr",
      email: "test@docuforge.dev",
      plan: "free",
    });
    expect(useAuthStore.getState().token).toBe("token");
    expect(useAuthStore.getState().user?.email).toBe("test@docuforge.dev");
  });

  it("logout clears everything", () => {
    useAuthStore.getState().login("token", {
      id: "usr",
      email: "test@docuforge.dev",
      plan: "free",
    });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("persists only non-sensitive auth state", () => {
    useAuthStore.getState().login("token", {
      id: "usr",
      email: "test@docuforge.dev",
      plan: "free",
    });
    const persisted = localStorage.getItem("docuforge-auth") || "";
    expect(persisted).toContain("test@docuforge.dev");
    expect(persisted).not.toContain("token");
  });

  it("updates user and authentication status", () => {
    useAuthStore.getState().login("token", {
      id: "usr",
      email: "test@docuforge.dev",
      plan: "free",
    });
    useAuthStore.getState().updateUser({
      id: "usr",
      email: "new@docuforge.dev",
      plan: "pro",
    });
    expect(useAuthStore.getState().user?.email).toBe("new@docuforge.dev");
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });

  it("sets hydration flag", () => {
    useAuthStore.getState().setHasHydrated(false);
    expect(useAuthStore.getState().hasHydrated).toBe(false);
    useAuthStore.getState().setHasHydrated(true);
    expect(useAuthStore.getState().hasHydrated).toBe(true);
  });

  it("treats expired JWTs as unauthenticated", () => {
    const expired = buildUnsignedJwt(Math.floor(Date.now() / 1000) - 60);

    expect(getJwtExpiryMs(expired)).not.toBeNull();
    expect(isJwtExpired(expired)).toBe(true);

    useAuthStore.getState().login(expired, {
      id: "usr",
      email: "test@docuforge.dev",
      plan: "free",
    });

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });
});
