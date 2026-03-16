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
    title: "Terms of Service",
    description:
      "Terms governing access to DocuForge, including accounts, billing, and acceptable use.",
    openGraph: {
      title: "Terms of Service · DocuForge",
      description:
        "Terms governing access to DocuForge, including accounts, billing, and acceptable use.",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: "DocuForge terms of service",
        },
      ],
    },
    twitter: {
      title: "Terms of Service · DocuForge",
      description:
        "Terms governing access to DocuForge, including accounts, billing, and acceptable use.",
      images: [ogImage],
    },
  };
}

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="These terms govern your access to DocuForge and the services we provide."
      lastUpdated={lastUpdated}
    >
      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          1. Agreement to these terms
        </h2>
        <p>
          By accessing or using DocuForge, you agree to these Terms of Service
          and to comply with all applicable laws and regulations. If you do not
          agree, do not use the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          2. Eligibility and accounts
        </h2>
        <p>
          You must be able to form a binding contract to use DocuForge. You are
          responsible for maintaining the confidentiality of your account
          credentials and for all activity under your account.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          3. Subscriptions, billing, and taxes
        </h2>
        <p>
          Paid plans are billed in advance on a recurring basis. You authorize
          us (and our payment processor) to charge your payment method for all
          fees and applicable taxes. All fees are non-refundable unless required
          by law or explicitly stated in your plan.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          4. Acceptable use
        </h2>
        <p>
          You agree not to misuse the service, attempt to disrupt the platform,
          or use DocuForge for illegal, harmful, or abusive content. Detailed
          restrictions are listed in our Content Policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          5. Your content and data
        </h2>
        <p>
          You retain ownership of the content, templates, and data you submit to
          DocuForge. You grant us a limited license to process that content solely
          to provide the service, including rendering outputs you request.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          6. Intellectual property
        </h2>
        <p>
          DocuForge and its associated trademarks, software, and documentation
          are owned by us or our licensors. These terms do not grant you any
          ownership rights to the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          7. Third-party services
        </h2>
        <p>
          DocuForge may integrate with third-party services (for example, payment
          processing or analytics). Your use of those services is governed by
          their respective terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          8. Disclaimers
        </h2>
        <p>
          The service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We
          disclaim all warranties, express or implied, including fitness for a
          particular purpose and non-infringement.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          9. Limitation of liability
        </h2>
        <p>
          To the fullest extent permitted by law, DocuForge will not be liable
          for any indirect, incidental, special, consequential, or punitive
          damages, or for any loss of profits or data.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          10. Indemnification
        </h2>
        <p>
          You agree to indemnify and hold DocuForge harmless from any claims or
          liabilities arising from your use of the service or violation of these
          terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          11. Termination
        </h2>
        <p>
          We may suspend or terminate your access if you violate these terms or
          if required to protect the service, other users, or legal compliance.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          12. Changes to these terms
        </h2>
        <p>
          We may update these terms from time to time. We will update the &quot;Last
          updated&quot; date and, when appropriate, provide additional notice.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--ink)]">
          13. Contact
        </h2>
        <p>
          Questions about these terms? Contact us at support@docuforge.app.
        </p>
      </section>
    </LegalLayout>
  );
}
