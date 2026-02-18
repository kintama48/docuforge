import type { MetadataRoute } from "next";
import { getAllLocalizedRoutes } from "@/src/lib/content-hub";

const baseUrl =
  process.env.NEXT_PUBLIC_MARKETING_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://docuforge.app";

function toAbsolute(path: string) {
  return new URL(path, baseUrl).toString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return getAllLocalizedRoutes().map((route) => ({
    url: toAbsolute(route),
    lastModified: now,
    changeFrequency: route.includes("/blog/") ? "weekly" : "daily",
    priority:
      route === "/" || route.endsWith("/templates/invoice") || route.endsWith("/compare/puppeteer-pdf-generation")
        ? 0.9
        : route.includes("/blog/") || route.includes("/templates/")
          ? 0.8
          : 0.7,
  }));
}
