import { describe, expect, it, beforeEach } from "vitest";
import { useAuthStore } from "@/src/stores/auth";

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

  it("persists to localStorage", () => {
    useAuthStore.getState().login("token", {
      id: "usr",
      email: "test@docuforge.dev",
      plan: "free",
    });
    expect(localStorage.getItem("docuforge-auth")).toContain("token");
  });
});
