import { describe, it, expect, vi } from "vitest";
import { renderWithProviders } from "@/tests/helpers/render";
import { QuickStartCard } from "@/src/components/dashboard/QuickStartCard";

vi.mock("@/src/hooks/use-api-keys", () => ({
  useApiKeys: () => ({ data: { keys: [{ prefix: "docu_live_123" }] } }),
}));

describe("QuickStartCard", () => {
  it("shows api key prefix", () => {
    const { getAllByText } = renderWithProviders(<QuickStartCard />);
    expect(getAllByText("docu_live_123").length).toBeGreaterThan(0);
  });
});
