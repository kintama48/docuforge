import { headers } from "next/headers";
import { normalizeLocale } from "@/src/lib/i18n-config";

export async function getRequestLocale() {
  const headerList = await headers();
  return normalizeLocale(headerList.get("x-docuforge-locale"));
}
