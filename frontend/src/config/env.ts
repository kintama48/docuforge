function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseBillingProvider(
  value: string | undefined
): "none" | "paddle" | "lemonsqueezy" {
  if (value === "paddle" || value === "lemonsqueezy") return value;
  if (process.env.NODE_ENV === "test") return "paddle";
  return "none";
}

export const env = {
  apiUrl:
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.VITE_API_URL ||
    "http://localhost:3000",
  billingEnabled: parseBool(
    process.env.NEXT_PUBLIC_BILLING_ENABLED,
    process.env.NODE_ENV === "test"
  ),
  billingProvider: parseBillingProvider(process.env.NEXT_PUBLIC_BILLING_PROVIDER),
  billingPortalUrl:
    process.env.NEXT_PUBLIC_BILLING_PORTAL_URL ||
    process.env.NEXT_PUBLIC_STRIPE_PORTAL_URL ||
    "",
  appName:
    process.env.NEXT_PUBLIC_APP_NAME ||
    process.env.VITE_APP_NAME ||
    "DocuForge",
  appUrl:
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VITE_APP_URL ||
    "http://localhost:3000",
  marketingUrl:
    process.env.NEXT_PUBLIC_MARKETING_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VITE_APP_URL ||
    "http://localhost:3000",
  consoleUrl:
    process.env.NEXT_PUBLIC_CONSOLE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VITE_APP_URL ||
    "http://localhost:3000",
  isDev: process.env.NODE_ENV !== "production",
} as const;
