import type {
  ComponentPropsWithoutRef,
  ElementType,
  ReactNode,
} from "react";
import { cn } from "@/src/lib/utils";

export type ContainerWidth = "marketing" | "wide" | "article" | "console";
export type SectionTone = "default" | "surface" | "inverse";
export type SectionSpacing = "default" | "hero" | "compact";
export type IntroVariant = "display" | "page";
export type IntroWidth = "default" | "reading";

type PolymorphicProps<T extends ElementType, Props> = Props &
  Omit<ComponentPropsWithoutRef<T>, keyof Props | "as"> & {
    as?: T;
  };

const containerClasses: Record<ContainerWidth, string> = {
  marketing: "page-shell",
  wide: "page-shell-wide",
  article: "page-shell-article",
  console: "page-shell-console",
};

const sectionToneClasses: Record<SectionTone, string> = {
  default: "",
  surface: "border-y border-[var(--line)] bg-[var(--surface)]",
  inverse: "bg-[var(--inverse-bg)] text-[var(--inverse-ink)]",
};

const sectionSpacingClasses: Record<SectionSpacing, string> = {
  default: "section-shell",
  hero: "section-shell-hero",
  compact: "py-10 sm:py-12 lg:py-14",
};

const introWidthClasses: Record<IntroWidth, string> = {
  default: "page-intro",
  reading: "page-intro page-intro-reading",
};

const introVariantClasses: Record<IntroVariant, string> = {
  display: "heading-display",
  page: "heading-page",
};

export function Container<T extends ElementType = "div">({
  as,
  width = "marketing",
  className,
  ...props
}: PolymorphicProps<T, { width?: ContainerWidth; className?: string }>) {
  const Component = as ?? "div";
  return (
    <Component
      className={cn(containerClasses[width], className)}
      {...props}
    />
  );
}

export function Section<T extends ElementType = "section">({
  as,
  tone = "default",
  spacing = "default",
  width = "marketing",
  className,
  innerClassName,
  children,
  ...props
}: PolymorphicProps<
  T,
  {
    tone?: SectionTone;
    spacing?: SectionSpacing;
    width?: ContainerWidth;
    className?: string;
    innerClassName?: string;
    children: ReactNode;
  }
>) {
  const Component = as ?? "section";
  return (
    <Component
      className={cn(
        sectionToneClasses[tone],
        sectionSpacingClasses[spacing],
        className
      )}
      {...props}
    >
      <Container width={width} className={innerClassName}>
        {children}
      </Container>
    </Component>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  meta,
  align = "left",
  variant = "page",
  width = "default",
  className,
  eyebrowClassName,
  titleClassName,
  descriptionClassName,
  metaClassName,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  align?: "left" | "center";
  variant?: IntroVariant;
  width?: IntroWidth;
  className?: string;
  eyebrowClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  metaClassName?: string;
}) {
  return (
    <div
      className={cn(
        introWidthClasses[width],
        "section-stack",
        align === "center" ? "mx-auto text-center" : "",
        className
      )}
    >
      {eyebrow ? <p className={cn("eyebrow", eyebrowClassName)}>{eyebrow}</p> : null}
      <h1 className={cn(introVariantClasses[variant], titleClassName)}>{title}</h1>
      {description ? (
        <p className={cn("text-lead", descriptionClassName)}>{description}</p>
      ) : null}
      {meta ? (
        <div className={cn("text-sm text-[var(--muted)]", metaClassName)}>{meta}</div>
      ) : null}
    </div>
  );
}
