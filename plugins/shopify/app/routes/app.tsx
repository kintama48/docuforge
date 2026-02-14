import type { LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import { NavMenu } from "@shopify/app-bridge-react";
import enTranslations from "@shopify/polaris/locales/en.json";
import { authenticate } from "~/shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
}

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <PolarisAppProvider i18n={enTranslations}>
      <NavMenu>
        <Link to="/app" rel="home">
          Dashboard
        </Link>
        <Link to="/app/settings">Settings</Link>
        <Link to="/app/render-logs">Render Logs</Link>
      </NavMenu>
      <Outlet />
    </PolarisAppProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  return (
    <PolarisAppProvider i18n={enTranslations}>
      <div style={{ padding: "2rem" }}>
        <h1>Something went wrong</h1>
        <p>
          {error instanceof Error
            ? error.message
            : "An unexpected error occurred."}
        </p>
        <p>
          <Link to="/app">Return to Dashboard</Link>
        </p>
      </div>
    </PolarisAppProvider>
  );
}
