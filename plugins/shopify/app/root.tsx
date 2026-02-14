import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import polarisStylesHref from "@shopify/polaris/build/esm/styles.css?url";
import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: polarisStylesHref },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const apiKey = process.env.SHOPIFY_API_KEY || "";
  return { apiKey, polarisTranslations: enTranslations, url: url.href };
}

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <Meta />
        <Links />
      </head>
      <body>
        <AppProvider i18n={enTranslations}>
          <Outlet />
        </AppProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
