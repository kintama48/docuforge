import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import OnboardingPage from "@/src/pages/onboarding/OnboardingPage";
import { useAuthStore } from "@/src/stores/auth";
import { useOnboardingStore } from "@/src/stores/onboarding";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/onboarding",
}));

describe("onboarding flow", () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: "test-jwt",
      user: { id: "usr", email: "test@docuforge.dev", plan: "free" },
    });
    useOnboardingStore.getState().reset();
    useOnboardingStore.setState({ apiKey: "docu_live_test_123" });
  });

  it("walks through template selection, api key, and quick start", async () => {
    renderWithProviders(<OnboardingPage />);

    expect(await screen.findByText(/official report/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /use this/i }));

    expect(
      await screen.findByRole("heading", { name: /your api key/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/docu_live_test_123/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /i've saved my key/i })
    );

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /make your first request/i })
      ).toBeInTheDocument()
    );
    expect(screen.getByText(/X-API-Key:/i)).toBeInTheDocument();
  });
});
