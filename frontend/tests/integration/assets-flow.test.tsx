import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { useAssets } from "@/src/hooks/use-assets";

function AssetsRunner() {
  const { data } = useAssets();
  return <div>{data?.assets?.[0]?.name}</div>;
}

describe("assets flow", () => {
  it("fetches assets list", async () => {
    renderWithProviders(<AssetsRunner />);
    expect(await screen.findByText("logo.png")).toBeInTheDocument();
  });
});
