import type { Metadata } from "next";
import { headers } from "next/headers";
import { LegalLayout } from "../components/legal-layout";
import { normalizeLocale } from "@/src/lib/i18n-config";

const lastUpdated = "February 14, 2026";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const locale = normalizeLocale(headersList.get("x-docuforge-locale"));
  const ogImage = `/og/${locale}`;

  return {
    title: "Content Policy",
    description:
      "Rules for content and usage on DocuForge to keep the platform safe and compliant.",
    openGraph: {
      title: "Content Policy · DocuForge",
      description:
        "Rules for content and usage on DocuForge to keep the platform safe and compliant.",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: "DocuForge content policy",
        },
      ],
    },
    twitter: {
      title: "Content Policy · DocuForge",
      description:
        "Rules for content and usage on DocuForge to keep the platform safe and compliant.",
      images: [ogImage],
    },
  };
}

export default function ContentPolicyPage() {
  return (
    <LegalLayout
      title="Content Policy"
      subtitle="Use DocuForge responsibly. This policy outlines what content and behavior are not allowed."
      lastUpdated={lastUpdated}
    >
      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          1. Prohibited content
        </h2>
        <p>
          You may not use DocuForge to generate, store, or distribute content
          that is illegal, fraudulent, or violates the rights of others.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Content that infringes intellectual property or privacy rights.</li>
          <li>Malware, phishing, or content designed to harm systems.</li>
          <li>Content that promotes violence or criminal activity.</li>
          <li>Exploitative or abusive content.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          2. Prohibited behavior
        </h2>
        <p>
          You may not attempt to disrupt or abuse the platform or other users.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Unauthorized access, scanning, or scraping.</li>
          <li>Abuse of rate limits or attempts to bypass security controls.</li>
          <li>Spam, deception, or misrepresentation.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          3. Enforcement
        </h2>
        <p>
          We may remove content, suspend access, or terminate accounts that
          violate this policy or our Terms of Service. We may also comply with
          legal requests where required.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          4. Reporting concerns
        </h2>
        <p>
          If you believe content on DocuForge violates this policy, contact us
          at hello@docuforge.app with relevant details.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          5. Changes to this policy
        </h2>
        <p>
          We may update this policy from time to time. We will update the &quot;Last
          updated&quot; date and provide notice when changes are material.
        </p>
      </section>
    </LegalLayout>
  );
}
