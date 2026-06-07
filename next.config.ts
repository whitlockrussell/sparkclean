import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Suppress source map upload logs unless in CI
  silent: !process.env.CI,

  // Route Sentry requests through a Next.js rewrite to bypass ad-blockers
  tunnelRoute: "/monitoring",
});
