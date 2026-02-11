import { describe, expect, it, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { VersionHistoryPanel } from "@/src/components/editor/VersionHistoryPanel";

const template = {
  id: "tpl",
  name: "Template",
  description: null,
  is_official: false,
  live_version: {
    id: "ver_1",
    version_number: 1,
    source: "#set page()",
    files: null,
    defaults: null,
    commit_message: "Initial",
    created_at: 1738377600,
  },
  versions: [
    {
      id: "ver_1",
      version_number: 1,
      commit_message: "Initial",
      created_at: 1738377600,
    },
  ],
  created_at: 1738377600,
  updated_at: 1738377600,
};

describe("VersionHistoryPanel", () => {
  it("renders versions", () => {
    renderWithProviders(
      <div className="relative h-96">
        <VersionHistoryPanel
          open={true}
          template={template as any}
          onClose={() => {}}
          onSelectVersion={(_id) => {}}
        />
      </div>
    );
    expect(screen.getByText(/version history/i)).toBeInTheDocument();
    expect(screen.getByText(/v1/i)).toBeInTheDocument();
  });

  it("returns null when closed", () => {
    renderWithProviders(
      <VersionHistoryPanel
        open={false}
        template={template as any}
        onClose={() => {}}
        onSelectVersion={(_id) => {}}
      />
    );
    expect(screen.queryByTestId("version-history-panel")).not.toBeInTheDocument();
  });

  it("renders empty state and revert action", () => {
    const onRevert = vi.fn();
    const onSelectVersion = vi.fn();
    renderWithProviders(
      <div className="relative h-96">
        <VersionHistoryPanel
          open={true}
          template={{ ...(template as any), versions: [] }}
          onClose={() => {}}
          onSelectVersion={onSelectVersion}
          currentVersionId="ver_1"
          viewingVersionId="ver_1"
          onRevert={onRevert}
        />
      </div>
    );
    expect(screen.getByText(/no versions/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /revert/i }));
    expect(onRevert).toHaveBeenCalledWith("ver_1");
  });

  it("calls onSelectVersion for a version", () => {
    const onSelectVersion = vi.fn();
    renderWithProviders(
      <div className="relative h-96">
        <VersionHistoryPanel
          open={true}
          template={template as any}
          onClose={() => {}}
          onSelectVersion={onSelectVersion}
          currentVersionId="ver_1"
          viewingVersionId="ver_1"
        />
      </div>
    );
    fireEvent.click(screen.getByTestId("version-item-1"));
    expect(onSelectVersion).toHaveBeenCalledWith("ver_1");
  });
});
