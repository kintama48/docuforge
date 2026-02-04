import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { useTemplates } from "@/src/hooks/use-templates";

function TemplatesRunner() {
  const { data } = useTemplates();
  return <div>{data?.templates?.[0]?.name}</div>;
}

describe("templates flow", () => {
  it("fetches templates list", async () => {
    renderWithProviders(<TemplatesRunner />);
    expect(await screen.findByText("Invoice")).toBeInTheDocument();
  });
});
