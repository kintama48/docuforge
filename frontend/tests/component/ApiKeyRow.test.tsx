import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { ApiKeyRow } from "@/src/components/settings/ApiKeyRow";

describe("ApiKeyRow", () => {
  it("calls actions", () => {
    const onCopy = vi.fn();
    const onRevoke = vi.fn();

    renderWithProviders(
      <table>
        <tbody>
          <ApiKeyRow
            name="Default"
            prefix="docu_live_test"
            lastUsedLabel="Never"
            createdLabel="Today"
            onCopy={onCopy}
            onRevoke={onRevoke}
          />
        </tbody>
      </table>
    );

    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(onCopy).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /revoke/i }));
    expect(onRevoke).toHaveBeenCalled();
  });
});
