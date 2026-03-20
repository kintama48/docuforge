export type ViewportKey = "mobile" | "tablet" | "desktop";

export type ViewportPreset = Readonly<{
  width: number;
  height: number;
  name: string;
}>;

export const responsiveBreakpoints = {
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;

export const desktopMediaQuery = `(min-width: ${responsiveBreakpoints.desktop}px)`;

export const viewportPresets: Record<ViewportKey, ViewportPreset> = {
  mobile: { width: 390, height: 844, name: "mobile" },
  tablet: { width: 820, height: 1180, name: "tablet" },
  desktop: { width: 1440, height: 900, name: "desktop" },
};
