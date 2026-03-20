import type { Metadata } from "next";
import { LegalLayout } from "../components/legal-layout";
import { ContactEmailLink } from "@/src/components/contact/ContactEmailLink";
import { buildPublicMetadata } from "@/src/lib/public-seo";
import { publicRoutes } from "@/src/lib/public-route-contract";
import { getRequestLocale } from "@/src/lib/request-locale";

const lastUpdated = "February 14, 2026";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();

  return buildPublicMetadata({
    locale,
    pathname: publicRoutes.contentPolicy,
    title: "Content Policy",
    description:
      "Rules for content and usage on DocuForge to keep the platform safe and compliant.",
    ogImage: `/og/${locale}`,
    ogAlt: "DocuForge content policy",
  });
}

export default function ContentPolicyPage() {
  return (
    <LegalLayout
      title="Content Policy"
      subtitle="Use DocuForge responsibly. This policy outlines what content and behavior are not allowed."
      lastUpdated={lastUpdated}
    >
      <section className="space-y-3">
        <h2 className="heading-section">
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
        <h2 className="heading-section">
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
        <h2 className="heading-section">
          3. Enforcement
        </h2>
        <p>
          We may remove content, suspend access, or terminate accounts that
          violate this policy or our Terms of Service. We may also comply with
          legal requests where required.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section">
          4. Reporting concerns
        </h2>
        <p>
          If you believe content on DocuForge violates this policy, contact us
          via our{" "}
          <ContactEmailLink
            localPart="support"
            domain="docuforge.app"
            label="support@docuforge.app"
            fallbackLabel="support team"
            className="underline decoration-[var(--line-hover)] underline-offset-2"
          />{" "}
          with relevant details.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-section">
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
