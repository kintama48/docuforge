import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../helpers/render";
import { screen } from "@testing-library/react";
import { PublishDialog } from "@/src/components/editor/PublishDialog";

describe("PublishDialog", () => {
  it("renders commit message input", () => {
    renderWithProviders(
      <PublishDialog open={true} templateId="tpl_1" onClose={() => {}} />
    );
    expect(
      screen.getByPlaceholderText(/describe what changed/i)
    ).toBeInTheDocument();
  });
});
