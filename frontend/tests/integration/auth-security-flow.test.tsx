import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderWithProviders } from "../helpers/render";
import { server } from "../helpers/msw-server";
import { LoginForm } from "@/src/components/auth/LoginForm";
import { RegisterForm } from "@/src/components/auth/RegisterForm";
import { useAuthStore } from "@/src/stores/auth";
import { useOnboardingStore } from "@/src/stores/onboarding";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("redirect=/secure-area"),
}));

describe("auth security flow", () => {
  beforeEach(() => {
    pushMock.mockReset();
    useAuthStore.setState({ token: null, user: null });
    useOnboardingStore.getState().reset();
  });

  it("completes signup email verification and stores onboarding API key", async () => {
    server.use(
      http.post("http://localhost:3000/console/auth/register", async () =>
        HttpResponse.json(
          {
            verification_required: true,
            challenge_id: "otp_signup_1",
            expires_in_ms: 600000,
            resend_after_ms: 30000,
            user: { id: "usr_new", email: "new@docuforge.dev", plan: "free" },
          },
          { status: 202 }
        )
      ),
      http.post("http://localhost:3000/console/auth/verify-email", async () =>
        HttpResponse.json({
          email_verified: true,
          token: "tok_signup_verified",
          user: { id: "usr_new", email: "new@docuforge.dev", plan: "free" },
          api_key: {
            raw_key: "docu_live_signup_verified",
            prefix: "docu_live_",
            name: "Default",
            note: "Save this key",
          },
        })
      )
    );

    renderWithProviders(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "new@docuforge.dev" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByRole("heading", { name: /verify your email/i })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/verification code/i), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verify email/i }));

    await waitFor(() =>
      expect(useAuthStore.getState().token).toBe("tok_signup_verified")
    );
    expect(useOnboardingStore.getState().apiKey).toBe("docu_live_signup_verified");
    expect(pushMock).toHaveBeenCalledWith("/onboarding");
  });

  it("handles login email verification challenge and resumes redirect flow", async () => {
    server.use(
      http.post("http://localhost:3000/console/auth/login", async () =>
        HttpResponse.json(
          {
            verification_required: true,
            challenge_id: "otp_login_verify_1",
            expires_in_ms: 600000,
            resend_after_ms: 30000,
          },
          { status: 403 }
        )
      ),
      http.post("http://localhost:3000/console/auth/verify-email", async () =>
        HttpResponse.json({
          email_verified: true,
          token: "tok_login_verified",
          user: { id: "usr_existing", email: "existing@docuforge.dev", plan: "starter" },
        })
      )
    );

    renderWithProviders(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "existing@docuforge.dev" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByRole("heading", { name: /verify your email/i })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/verification code/i), {
      target: { value: "654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verify code/i }));

    await waitFor(() =>
      expect(useAuthStore.getState().token).toBe("tok_login_verified")
    );
    expect(useOnboardingStore.getState().apiKey).toBeNull();
    expect(pushMock).toHaveBeenCalledWith("/secure-area");
  });

  it("handles 2FA challenge with resend and final verification", async () => {
    server.use(
      http.post("http://localhost:3000/console/auth/login", async () =>
        HttpResponse.json({
          two_factor_required: true,
          challenge_id: "otp_login_2fa_1",
          expires_in_ms: 600000,
          resend_after_ms: 30000,
          user: { id: "usr_existing", email: "existing@docuforge.dev", plan: "starter" },
        })
      ),
      http.post("http://localhost:3000/console/auth/2fa/resend", async () =>
        HttpResponse.json({
          sent: true,
          challenge_id: "otp_login_2fa_1",
          expires_in_ms: 600000,
          resend_after_ms: 30000,
        })
      ),
      http.post("http://localhost:3000/console/auth/2fa/verify", async () =>
        HttpResponse.json({
          token: "tok_2fa_verified",
          user: { id: "usr_existing", email: "existing@docuforge.dev", plan: "starter" },
        })
      )
    );

    renderWithProviders(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "existing@docuforge.dev" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByRole("heading", { name: /two-factor authentication/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /resend code/i }));
    expect(
      await screen.findByText(/new verification code has been sent/i)
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/verification code/i), {
      target: { value: "222222" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verify code/i }));

    await waitFor(() =>
      expect(useAuthStore.getState().token).toBe("tok_2fa_verified")
    );
    expect(pushMock).toHaveBeenCalledWith("/secure-area");
  });
});
