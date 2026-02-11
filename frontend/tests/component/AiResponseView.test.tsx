import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { AiResponseView } from "@/src/components/ai/AiResponseView";

const registerTypstLanguage = vi.fn();

vi.mock("@/src/lib/typst", () => ({
  registerTypstLanguage: (...args: any[]) => registerTypstLanguage(...args),
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    return (props: { modified: string; beforeMount?: (monaco: any) => void }) => {
      props.beforeMount?.({ languages: {} });
      return <div data-testid="diff-editor">{props.modified}</div>;
    };
  },
}));

describe("AiResponseView", () => {
  it("renders response and handles actions", () => {
    const onApply = vi.fn();
    const onDiscard = vi.fn();

    renderWithProviders(
      <AiResponseView
        response="#set page()"
        original="original"
        onApply={onApply}
        onDiscard={onDiscard}
      />
    );

    expect(screen.getByText(/ai response/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
    expect(onApply).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /discard/i }));
    expect(onDiscard).toHaveBeenCalled();
    expect(registerTypstLanguage).toHaveBeenCalled();
  });
});
