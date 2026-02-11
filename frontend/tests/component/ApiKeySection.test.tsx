import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { ApiKeySection } from "@/src/components/settings/ApiKeySection";

const revokeMutate = vi.fn();
const createMutate = vi.fn();

let keysData = {
  keys: [
    {
      id: "key_1",
      name: "Default",
      prefix: "docu_live_123",
      last_used_at: null,
      created_at: 1738377600,
    },
  ],
};

vi.mock("@/src/hooks/use-api-keys", () => ({
  useApiKeys: () => ({ data: keysData }),
  useCreateApiKey: () => ({ mutate: createMutate, isPending: false }),
  useRevokeApiKey: () => ({ mutate: revokeMutate, isPending: false }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("ApiKeySection", () => {
  beforeEach(() => {
    revokeMutate.mockReset();
    createMutate.mockReset();
    keysData = {
      keys: [
        {
          id: "key_1",
          name: "Default",
          prefix: "docu_live_123",
          last_used_at: null,
          created_at: 1738377600,
        },
      ],
    };
  });

  it("copies and revokes keys", () => {
    renderWithProviders(<ApiKeySection />);
    const clipboardSpy = vi.spyOn(navigator.clipboard, "writeText");
    const confirmSpy = vi.spyOn(globalThis, "confirm").mockReturnValue(true);

    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(clipboardSpy).toHaveBeenCalledWith("docu_live_123");

    fireEvent.click(screen.getByRole("button", { name: /revoke/i }));
    expect(revokeMutate).toHaveBeenCalledWith("key_1");

    clipboardSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  it("skips revocation when confirmation is denied", () => {
    const confirmSpy = vi.spyOn(globalThis, "confirm").mockReturnValue(false);
    renderWithProviders(<ApiKeySection />);

    fireEvent.click(screen.getByRole("button", { name: /revoke/i }));
    expect(revokeMutate).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it("creates a new key and copies it", async () => {
    createMutate.mockImplementation((_payload, options) => {
      options?.onSuccess?.({ raw_key: "docu_live_new", prefix: "docu_live_" });
    });

    renderWithProviders(<ApiKeySection />);
    fireEvent.click(screen.getByRole("button", { name: /create new key/i }));
    fireEvent.change(screen.getByPlaceholderText(/production/i), {
      target: { value: "My key" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(createMutate).toHaveBeenCalled();

    await waitFor(() =>
      expect(screen.getByText("docu_live_new")).toBeInTheDocument()
    );

    const dialog = screen.getByRole("dialog");
    const clipboardSpy = vi.spyOn(navigator.clipboard, "writeText");
    fireEvent.click(within(dialog).getByRole("button", { name: /copy/i }));
    expect(clipboardSpy).toHaveBeenCalledWith("docu_live_new");

    fireEvent.click(screen.getByRole("button", { name: /saved/i }));
    clipboardSpy.mockRestore();
  });
});
