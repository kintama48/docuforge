import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/src/app/components/site-header";
import { SiteFooter } from "@/src/app/components/site-footer";
import { env } from "@/src/config/env";

export const metadata: Metadata = {
  title: "Template Library | DocuForge",
  description:
    "Production-ready PDF templates. Pick a template, edit the JSON, ship a PDF in 30 seconds.",
};

interface OfficialTemplate {
  id: string;
  name: string;
  description: string | null;
  preview_url: string | null;
  slug: string;
}

async function fetchOfficialTemplates(): Promise<OfficialTemplate[]> {
  try {
    const res = await fetch(`${env.apiUrl}/v1/templates/official`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { templates: OfficialTemplate[] };
    return json.templates ?? [];
  } catch {
    return [];
  }
}

export default async function TemplateLibraryPage() {
  const templates = await fetchOfficialTemplates();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1400px] px-6 py-16 xl:px-8">
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Template Library
          </p>
          <h1 className="font-display text-4xl text-[var(--ink)] sm:text-5xl">
            Production-ready templates
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--muted)]">
            Pick a template, edit the JSON, ship a PDF in 30 seconds.
          </p>
        </div>

        {templates.length === 0 ? (
          <p className="text-center text-[var(--muted)]">No templates available yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] transition hover:border-[var(--accent)]/40 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg)]">
                  {tpl.preview_url ? (
                    <Image
                      src={tpl.preview_url}
                      alt={`Preview of ${tpl.name}`}
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[var(--muted-dim)] text-sm">
                      No preview
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-base font-semibold text-[var(--ink)]">{tpl.name}</h2>
                  {tpl.description && (
                    <p className="mt-1 flex-1 text-sm text-[var(--muted)]">{tpl.description}</p>
                  )}
                  <Link
                    href={`/playground/${tpl.slug}`}
                    className="btn btn-primary btn-sm mt-4 w-full text-center"
                  >
                    Use template →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
