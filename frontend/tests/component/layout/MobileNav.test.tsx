import { it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MobileNav } from "@/src/components/layout/MobileNav";

it("renders mobile navigation links", () => {
  const { getByText } = render(<MobileNav />);
  expect(getByText(/Dashboard/i)).toBeInTheDocument();
  expect(getByText(/Settings/i)).toBeInTheDocument();
});
