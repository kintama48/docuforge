import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Suppress source map upload logs during build
  silent: true,

  // Disable source map upload (no auth token configured by default)
  disableServerWebpackPlugin: true,
  disableClientWebpackPlugin: true,
});
