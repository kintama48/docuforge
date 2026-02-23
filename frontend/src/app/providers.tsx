"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IconContext } from "@phosphor-icons/react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/src/lib/theme";
import { I18nProvider } from "@/src/lib/i18n";
import type { Locale } from "@/src/lib/i18n-config";

export default function Providers({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: 0 },
        },
      })
  );

  return (
    <ThemeProvider>
      <I18nProvider initialLocale={initialLocale}>
        <IconContext.Provider
          value={{ size: 18, weight: "regular", className: "phosphor-icon" }}
        >
          <QueryClientProvider client={queryClient}>
            {children}
            <Toaster position="bottom-right" richColors />
          </QueryClientProvider>
        </IconContext.Provider>
      </I18nProvider>
    </ThemeProvider>
  );
}
