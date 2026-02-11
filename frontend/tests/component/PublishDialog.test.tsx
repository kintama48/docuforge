import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../helpers/render";
import { fireEvent, screen } from "@testing-library/react";
import { PublishDialog } from "@/src/components/editor/PublishDialog";
import { useEditorStore } from "@/src/stores/editor";

const publishMutate = vi.fn();
let pending = false;

vi.mock("@/src/hooks/use-templates", () => ({
  usePublishVersion: () => ({ mutate: publishMutate, isPending: pending }),
}));

describe("PublishDialog", () => {
  beforeEach(() => {
    publishMutate.mockReset();
    pending = false;
    useEditorStore.setState({
      source: "#set page()",
      files: {},
      data: {},
      markClean: vi.fn(),
      setPublishedVersion: vi.fn(),
    } as any);
  });

  it("renders commit message input", () => {
    renderWithProviders(
      <PublishDialog open={true} templateId="tpl_1" onClose={() => {}} />
    );
    expect(
      screen.getByPlaceholderText(/describe what changed/i)
    ).toBeInTheDocument();
  });

  it("publishes and updates editor state", () => {
    const onClose = vi.fn();
    publishMutate.mockImplementation((_payload, options) => {
      options?.onSuccess?.({ version: { version_number: 2 } });
    });
    renderWithProviders(
      <PublishDialog open={true} templateId="tpl_1" onClose={onClose} />
    );
    fireEvent.change(screen.getByPlaceholderText(/describe what changed/i), {
      target: { value: "Initial publish" },
    });
    fireEvent.click(screen.getByRole("button", { name: /publish/i }));

    expect(publishMutate).toHaveBeenCalledWith(
      {
        id: "tpl_1",
        source: "#set page()",
        files: {},
        defaults: {},
        commit_message: "Initial publish",
      },
      expect.any(Object)
    );

    const markClean = useEditorStore.getState().markClean as unknown as ReturnType<
      typeof vi.fn
    >;
    const setPublishedVersion = useEditorStore.getState()
      .setPublishedVersion as unknown as ReturnType<typeof vi.fn>;
    expect(markClean).toHaveBeenCalled();
    expect(setPublishedVersion).toHaveBeenCalledWith(2);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows pending state", () => {
    pending = true;
    renderWithProviders(
      <PublishDialog open={true} templateId="tpl_1" onClose={() => {}} />
    );
    expect(screen.getByRole("button", { name: /publishing/i })).toBeDisabled();
  });
});
