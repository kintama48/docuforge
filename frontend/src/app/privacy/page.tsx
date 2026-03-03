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
    title: "Privacy Policy",
    description:
      "How DocuForge collects, uses, and protects your personal information.",
    openGraph: {
      title: "Privacy Policy · DocuForge",
      description:
        "How DocuForge collects, uses, and protects your personal information.",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: "DocuForge privacy policy",
        },
      ],
    },
    twitter: {
      title: "Privacy Policy · DocuForge",
      description:
        "How DocuForge collects, uses, and protects your personal information.",
      images: [ogImage],
    },
  };
}

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="This policy explains how we handle personal data when you use DocuForge."
      lastUpdated={lastUpdated}
    >
      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          1. Information we collect
        </h2>
        <p>
          We collect information you provide directly, such as your name, email
          address, company, and billing details. We also collect usage data like
          API requests, template activity, and performance metrics.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          2. Content and files
        </h2>
        <p>
          We process the templates, data inputs, and files you submit to render
          documents. We do not use your content to train public models or share
          it with other customers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          3. How we use information
        </h2>
        <p>
          We use information to operate the service, provide support, improve
          reliability, prevent abuse, and communicate about product updates. We
          may send account or billing-related emails.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          4. Sharing and disclosures
        </h2>
        <p>
          We share data with trusted service providers who process it on our
          behalf, such as payment processors and infrastructure vendors. We may
          also disclose information if required by law or to protect the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          5. Data retention
        </h2>
        <p>
          We retain personal data for as long as necessary to provide the
          service, meet legal obligations, resolve disputes, and enforce
          agreements. You can request deletion of your account data.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          6. Security
        </h2>
        <p>
          We use administrative, technical, and physical safeguards to protect
          data. No system is 100% secure, so we cannot guarantee absolute
          security.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          7. Your rights
        </h2>
        <p>
          Depending on your location, you may have rights to access, correct, or
          delete your personal data. Contact us if you want to exercise these
          rights.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          8. International transfers
        </h2>
        <p>
          Your data may be processed in countries where we or our providers
          operate. We take steps to ensure appropriate safeguards are in place.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          9. Changes to this policy
        </h2>
        <p>
          We may update this policy from time to time. We will update the &quot;Last
          updated&quot; date and provide notice when changes are material.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          10. Contact
        </h2>
        <p>
          Questions about privacy? Contact us at hello@docuforge.app.
        </p>
      </section>
    </LegalLayout>
  );
}
