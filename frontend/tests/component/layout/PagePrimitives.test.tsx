import { expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Container,
  PageIntro,
  Section,
} from "@/src/components/layout/page-primitives";

it("applies centralized container and section classes", () => {
  render(
    <Section
      tone="surface"
      spacing="hero"
      width="console"
      data-testid="section"
      innerClassName="inner-shell"
    >
      <div>Responsive shell</div>
    </Section>
  );

  expect(screen.getByTestId("section")).toHaveClass(
    "border-y",
    "section-shell-hero"
  );
  expect(screen.getByText(/Responsive shell/i).parentElement).toHaveClass(
    "page-shell-console",
    "inner-shell"
  );
});

it("uses display and reading variants for centralized page intros", () => {
  const { rerender } = render(
    <Container width="article" data-testid="container">
      <PageIntro
        eyebrow="Docs"
        title="Readable content"
        description="Consistent responsive typography"
        variant="display"
        width="reading"
      />
    </Container>
  );

  expect(screen.getByTestId("container")).toHaveClass("page-shell-article");
  expect(screen.getByText(/Docs/i)).toHaveClass("eyebrow");
  expect(screen.getByRole("heading", { name: /Readable content/i })).toHaveClass(
    "heading-display"
  );
  expect(
    screen.getByText(/Consistent responsive typography/i).parentElement
  ).toHaveClass("page-intro-reading");

  rerender(
    <PageIntro
      title="Section heading"
      description="Fallback page heading role"
      variant="page"
    />
  );

  expect(screen.getByRole("heading", { name: /Section heading/i })).toHaveClass(
    "heading-page"
  );
});
