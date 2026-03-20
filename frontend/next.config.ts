import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async headers() {
    const edgeCache = [
      {
        key: "Cache-Control",
        value: "public, max-age=0, s-maxage=604800, stale-while-revalidate=86400",
      },
    ];
    const globalHeaders = [
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
    ];
    const cachedRoutes = [
      "/blog",
      "/blog/:slug*",
      "/templates",
      "/templates/:slug*",
      "/compare",
      "/compare/:slug*",
      "/industries",
      "/industries/:slug*",
      "/playground",
      "/docs",
      "/docs/:slug*",
      "/sitemap.xml",
    ];
    const localePrefix = "/:locale(fr|de|it|es|ar|zh)";

    return [
      { source: "/:path*", headers: globalHeaders },
      ...cachedRoutes.flatMap((source) => [
        { source, headers: edgeCache },
        { source: `${localePrefix}${source}`, headers: edgeCache },
      ]),
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress source map upload logs during build
  silent: true,

  // Disable source map upload (no auth token configured by default)
  sourcemaps: {
    disable: true,
  },
});
