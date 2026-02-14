/// <reference types="@remix-run/node" />
/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    SHOPIFY_API_KEY: string;
    SHOPIFY_API_SECRET: string;
    SHOPIFY_APP_URL: string;
    SCOPES: string;
    DATABASE_URL: string;
    ENCRYPTION_KEY: string;
    INTERNAL_API_SECRET?: string;
    SHOP_CUSTOM_DOMAIN?: string;
    NODE_ENV: "development" | "production" | "test";
    PORT?: string;
    HOST?: string;
  }
}
