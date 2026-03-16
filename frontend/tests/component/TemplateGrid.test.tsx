import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderWithProviders } from "../helpers/render";
import { server } from "../helpers/msw-server";
import { TemplateGrid } from "@/src/components/dashboard/TemplateGrid";

describe("TemplateGrid", () => {
  it("renders templates", async () => {
    renderWithProviders(<TemplateGrid />);
    expect(await screen.findByText("Invoice")).toBeInTheDocument();
  });

  it("shows empty state when no templates", async () => {
    server.use(
      http.get("http://localhost:3000/console/templates", async () =>
        HttpResponse.json({
          templates: [],
          pagination: { page: 1, limit: 20, total: 0 },
        })
      )
    );

    renderWithProviders(<TemplateGrid />);
    expect(
      await screen.findByText(/no templates yet/i)
    ).toBeInTheDocument();
  });
});
