export const env = {
  apiUrl:
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.VITE_API_URL ||
    "http://localhost:3000",
  stripeKey:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    process.env.VITE_STRIPE_PUBLISHABLE_KEY ||
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
