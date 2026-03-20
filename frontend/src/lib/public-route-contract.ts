import { invariant } from "@/src/lib/assert";

export const publicRoutes = {
  home: "/",
  pricing: "/pricing",
  docs: "/docs",
  docsMcp: "/docs/mcp",
  docsMcpCursor: "/docs/mcp/cursor",
  docsMcpClaude: "/docs/mcp/claude",
  docsMcpCodex: "/docs/mcp/codex",
  blog: "/blog",
  templates: "/templates",
  compare: "/compare",
  industries: "/industries",
  playground: "/playground",
  terms: "/terms",
  privacy: "/privacy",
  contentPolicy: "/content-policy",
} as const;

export const publicAnchorRoutes = {
  features: "/#features",
  workflow: "/#workflow",
  api: "/#api",
} as const;

export const publicStaticSitemapRoutes = [
  publicRoutes.home,
  publicRoutes.pricing,
  publicRoutes.docs,
  publicRoutes.docsMcp,
  publicRoutes.docsMcpCursor,
  publicRoutes.docsMcpClaude,
  publicRoutes.docsMcpCodex,
  publicRoutes.playground,
  publicRoutes.blog,
  publicRoutes.templates,
  publicRoutes.compare,
  publicRoutes.industries,
  publicRoutes.terms,
  publicRoutes.privacy,
  publicRoutes.contentPolicy,
] as const;

export const consolePathPrefixes = [
  "/dashboard",
  "/editor",
  "/settings",
  "/onboarding",
  "/login",
  "/register",
  "/oauth",
] as const;

const marketingExactPaths = new Set<string>([
  publicRoutes.home,
  publicRoutes.pricing,
  "/plans",
  publicRoutes.terms,
  publicRoutes.privacy,
  publicRoutes.contentPolicy,
  publicRoutes.blog,
  publicRoutes.templates,
  publicRoutes.compare,
  publicRoutes.industries,
  publicRoutes.playground,
  publicRoutes.docs,
  publicRoutes.docsMcp,
  publicRoutes.docsMcpCursor,
  publicRoutes.docsMcpClaude,
  publicRoutes.docsMcpCodex,
]);

const marketingPrefixPaths = [
  publicRoutes.docs,
  publicRoutes.blog,
  publicRoutes.templates,
  publicRoutes.compare,
  publicRoutes.industries,
  publicRoutes.playground,
  "/og",
] as const;

export function assertAbsolutePath(path: string) {
  invariant(path.startsWith("/"), `Expected an absolute path, received "${path}"`);
}

export function isMarketingPath(basePath: string) {
  assertAbsolutePath(basePath);
  if (marketingExactPaths.has(basePath)) return true;
  return marketingPrefixPaths.some(
    (prefix) => basePath === prefix || basePath.startsWith(`${prefix}/`)
  );
}

export function isConsolePath(basePath: string) {
  assertAbsolutePath(basePath);
  return consolePathPrefixes.some(
    (prefix) => basePath === prefix || basePath.startsWith(`${prefix}/`)
  );
}
