import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MobileNav } from "@/src/components/layout/MobileNav";
import { useAuthStore } from "@/src/stores/auth";

describe("MobileNav", () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: "jwt-token",
      user: { id: "usr_1", email: "dev@docuforge.dev", plan: "free" },
      logout: vi.fn(),
    } as any);
  });

  it("stays hidden when closed", () => {
    render(<MobileNav open={false} onClose={vi.fn()} />);
    expect(screen.queryByText(/Dashboard/i)).not.toBeInTheDocument();
  });

  it("renders navigation links and closes for drawer actions", () => {
    const onClose = vi.fn();
    const logout = vi.fn();
    useAuthStore.setState({ logout } as any);

    render(<MobileNav open={true} onClose={onClose} />);

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Settings/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /close navigation/i })[0]);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /log out/i }));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
