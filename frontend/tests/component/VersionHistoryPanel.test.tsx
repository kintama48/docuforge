import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
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
});
