import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async headers() {
    const longLivedEdgeCache = [
      {
        key: "Cache-Control",
        value: "public, max-age=0, s-maxage=259200, stale-while-revalidate=86400",
      },
    ];

    return [
      {
        source: "/playground",
        headers: longLivedEdgeCache,
      },
      {
        source: "/blog/:path*",
        headers: longLivedEdgeCache,
      },
      {
        source: "/templates/:path*",
        headers: longLivedEdgeCache,
      },
      {
        source: "/compare/:path*",
        headers: longLivedEdgeCache,
      },
      {
        source: "/industries/:path*",
        headers: longLivedEdgeCache,
      },
      {
        source: "/:locale(fr|de|it|es|ar|zh)/playground",
        headers: longLivedEdgeCache,
      },
      {
        source: "/:locale(fr|de|it|es|ar|zh)/blog/:path*",
        headers: longLivedEdgeCache,
      },
      {
        source: "/:locale(fr|de|it|es|ar|zh)/templates/:path*",
        headers: longLivedEdgeCache,
      },
      {
        source: "/:locale(fr|de|it|es|ar|zh)/compare/:path*",
        headers: longLivedEdgeCache,
      },
      {
        source: "/:locale(fr|de|it|es|ar|zh)/industries/:path*",
        headers: longLivedEdgeCache,
      },
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
