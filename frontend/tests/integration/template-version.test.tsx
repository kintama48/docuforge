import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../helpers/render";
import { fireEvent, screen } from "@testing-library/react";
import { useTemplateVersion } from "@/src/hooks/use-templates";

function VersionLoader() {
  const version = useTemplateVersion("tpl_1");
  return (
    <div>
      <button onClick={() => version.mutate("ver_1")}>Load</button>
      <span>{version.data?.version.source}</span>
    </div>
  );
}

describe("template version flow", () => {
  it("fetches version detail", async () => {
    renderWithProviders(<VersionLoader />);
    fireEvent.click(screen.getByText(/load/i));
    expect(await screen.findByText(/#set page/i)).toBeInTheDocument();
  });
});
