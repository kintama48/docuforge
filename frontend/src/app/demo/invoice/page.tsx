import type { Metadata } from "next";
import { SiteHeader } from "@/src/app/components/site-header";
import { SiteFooter } from "@/src/app/components/site-footer";
import InvoiceDemo from "@/src/components/demo/InvoiceDemo";

export const metadata: Metadata = {
  title: "Free Invoice Generator — Create & Download PDF | DocuForge",
  description:
    "Generate a professional PDF invoice in seconds — no signup required. Fill in your details, click Generate, and download. Powered by DocuForge.",
  openGraph: {
    title: "Free Invoice Generator | DocuForge",
    description:
      "Fill in invoice fields, click Generate, and download a PDF. No account needed. Powered by DocuForge.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Invoice Generator | DocuForge",
    description: "Fill in invoice fields, click Generate, and download a PDF. No account needed.",
  },
};

export default function DemoInvoicePage() {
  return (
    <div className="min-h-screen page-background">
      <SiteHeader />
      <main>
        <InvoiceDemo />
      </main>
      <SiteFooter />
    </div>
  );
}
