import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../helpers/render";
import { screen } from "@testing-library/react";
import { OfficialTemplateGallery } from "@/src/components/dashboard/OfficialTemplateGallery";

describe("OfficialTemplateGallery", () => {
  it("renders official templates", async () => {
    renderWithProviders(<OfficialTemplateGallery />);
    expect(
      await screen.findByText(/official report/i)
    ).toBeInTheDocument();
  });
});
