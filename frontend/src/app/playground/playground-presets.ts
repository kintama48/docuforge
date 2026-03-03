import type { LowCodeSpec } from "@/src/lib/low-code";

export type PlaygroundPresetCategory =
  | "finance"
  | "logistics"
  | "compliance"
  | "operations"
  | "legal";

export type PlaygroundPreset = {
  id: string;
  slug: string;
  category: PlaygroundPresetCategory;
  title: string;
  description: string;
  tags: string[];
  icon: "freight" | "invoice" | "certificate" | "purchase" | "quote" | "document";
  hints: string[];
  source: string;
  lowCodeSpec: LowCodeSpec;
  data: string;
  seoTitle: string;
  seoDescription: string;
};

export type HeaderBlock = Extract<LowCodeSpec["blocks"][number], { type: "header" }>;
export type ParagraphBlock = Extract<LowCodeSpec["blocks"][number], { type: "paragraph" }>;
export type LineItemsBlock = Extract<LowCodeSpec["blocks"][number], { type: "line_items_table" }>;

export const playgroundPresetCategories: Array<{
  value: "all" | PlaygroundPresetCategory;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "finance", label: "Finance" },
  { value: "logistics", label: "Logistics" },
  { value: "operations", label: "Operations" },
  { value: "compliance", label: "Compliance" },
  { value: "legal", label: "Legal" },
];

export const playgroundPresets: PlaygroundPreset[] = [
  {
    id: "freight-invoice",
    slug: "freight-invoice-template",
    category: "logistics",
    title: "Freight Invoice",
    description: "Lane billing template for LTL/FTL invoices with surcharge lines.",
    tags: ["freight", "invoice", "logistics", "carrier"],
    icon: "freight",
    hints: [
      "Update pickup and drop-off locations first.",
      "Keep surcharge labels short for clean print layouts.",
    ],
    source: `#set page(paper: "a4", margin: 16pt)
#set text(font: "Inter", size: 10pt)

= Freight Invoice #sys.inputs.invoice_id

Client: #sys.inputs.customer_name
Route: #sys.inputs.origin -> #sys.inputs.destination
Date: #sys.inputs.date

#for line in sys.inputs.lines {
  - #line.label (#line.qty) ..... $ #line.amount
}

#align(right)[
  *Subtotal:* $ #sys.inputs.subtotal \\
  *Fuel surcharge:* $ #sys.inputs.fuel_surcharge \\
  *Total due:* $ #sys.inputs.total_due
]`,
    lowCodeSpec: {
      version: 1,
      meta: { page: "a4", margin: "18pt" },
      blocks: [
        {
          type: "header",
          props: {
            title: "{{invoice.title}}",
            subtitle: "{{invoice.route}}",
            align: "left",
          },
        },
        {
          type: "paragraph",
          props: {
            text: "{{invoice.customer}}",
          },
        },
        { type: "divider" },
        {
          type: "line_items_table",
          props: {
            title: "Freight line items",
            items_path: "lines",
            columns: ["description", "qty", "price", "total"],
          },
        },
      ],
    },
    data: `{
  "invoice": {
    "title": "Freight Invoice FRT-2026-0042",
    "route": "Dallas, TX -> Memphis, TN",
    "customer": "Northbound Distribution"
  },
  "lines": [
    { "description": "Linehaul (LTL)", "qty": 1, "price": 780.0, "total": 780.0 },
    { "description": "Liftgate", "qty": 1, "price": 45.0, "total": 45.0 },
    { "description": "Detention", "qty": 2, "price": 60.0, "total": 120.0 }
  ]
}`,
    seoTitle: "Freight Invoice Template (LTL/FTL) | DocuForge Playground",
    seoDescription:
      "Free freight invoice template with live PDF preview. Start with LTL/FTL linehaul, surcharges, and route-based billing fields.",
  },
  {
    id: "shopify-invoice",
    slug: "shopify-invoice-template",
    category: "finance",
    title: "Shopify Invoice",
    description: "Clean e-commerce invoice layout with SKU and tax totals.",
    tags: ["shopify", "invoice", "e-commerce", "tax"],
    icon: "invoice",
    hints: [
      "Match SKUs to fulfillment exports.",
      "Keep taxes explicit to reduce support disputes.",
    ],
    source: `#set page(paper: "a4", margin: 16pt)
#set text(font: "Inter", size: 10pt)

= Invoice #sys.inputs.order_number

Bill to: #sys.inputs.customer_name
Store: #sys.inputs.store_name

#for item in sys.inputs.items {
  - #item.sku · #item.name (#item.qty) ..... $ #item.total
}

#align(right)[
  *Subtotal:* $ #sys.inputs.subtotal \\
  *Tax:* $ #sys.inputs.tax \\
  *Total:* $ #sys.inputs.total
]`,
    lowCodeSpec: {
      version: 1,
      meta: { page: "a4", margin: "18pt" },
      blocks: [
        {
          type: "header",
          props: {
            title: "{{invoice.title}}",
            subtitle: "{{invoice.customer}}",
            align: "left",
          },
        },
        {
          type: "paragraph",
          props: {
            text: "{{invoice.store}}",
          },
        },
        { type: "divider" },
        {
          type: "line_items_table",
          props: {
            title: "Order line items",
            items_path: "items",
            columns: ["name", "qty", "price", "total"],
          },
        },
      ],
    },
    data: `{
  "invoice": {
    "title": "Shopify Invoice #SHP-21931",
    "customer": "Maya Nelson",
    "store": "DocuForge Supply"
  },
  "items": [
    { "name": "Premium notebook", "qty": 2, "price": 18.0, "total": 36.0 },
    { "name": "Shipping", "qty": 1, "price": 8.0, "total": 8.0 }
  ]
}`,
    seoTitle: "Shopify Invoice Template | DocuForge Playground",
    seoDescription:
      "Generate Shopify-style invoice PDFs with product lines, tax-ready totals, and live preview editing.",
  },
  {
    id: "purchase-order",
    slug: "purchase-order-template",
    category: "operations",
    title: "Purchase Order",
    description: "Supplier PO template with itemized quantities and unit prices.",
    tags: ["purchase order", "procurement", "supplier", "operations"],
    icon: "purchase",
    hints: [
      "Add supplier references in the subtitle.",
      "Keep item names normalized with your ERP catalog.",
    ],
    source: `#set page(paper: "a4", margin: 16pt)
#set text(font: "Inter", size: 10pt)

= Purchase Order #sys.inputs.po_number

Supplier: #sys.inputs.supplier_name
Requested by: #sys.inputs.requested_by
Delivery date: #sys.inputs.delivery_date

#for item in sys.inputs.items {
  - #item.name (#item.qty @ $ #item.unit_price) ..... $ #item.total
}

#align(right)[*Order total:* $ #sys.inputs.order_total]`,
    lowCodeSpec: {
      version: 1,
      meta: { page: "a4", margin: "18pt" },
      blocks: [
        {
          type: "header",
          props: {
            title: "{{po.title}}",
            subtitle: "{{po.supplier}}",
            align: "left",
          },
        },
        {
          type: "paragraph",
          props: {
            text: "{{po.requestedBy}}",
          },
        },
        { type: "divider" },
        {
          type: "line_items_table",
          props: {
            title: "PO line items",
            items_path: "items",
            columns: ["description", "qty", "price", "total"],
          },
        },
      ],
    },
    data: `{
  "po": {
    "title": "PO-2026-014",
    "supplier": "Delta Packaging Inc.",
    "requestedBy": "Requested by Warehouse Ops"
  },
  "items": [
    { "description": "Corrugated boxes (L)", "qty": 1200, "price": 0.62, "total": 744.0 },
    { "description": "Thermal labels", "qty": 20, "price": 14.5, "total": 290.0 }
  ]
}`,
    seoTitle: "Purchase Order Template PDF | DocuForge Playground",
    seoDescription:
      "Use this purchase order PDF template for supplier procurement, quantities, and itemized totals with live edits.",
  },
  {
    id: "packing-list",
    slug: "packing-list-template",
    category: "logistics",
    title: "Packing List",
    description: "Warehouse packing list with box-level contents and references.",
    tags: ["packing list", "warehouse", "fulfillment", "shipping"],
    icon: "freight",
    hints: [
      "Use concise carton descriptions for pick/pack speed.",
      "Add tracking references before sharing with carriers.",
    ],
    source: `#set page(paper: "a4", margin: 16pt)
#set text(font: "Inter", size: 10pt)

= Packing List #sys.inputs.shipment_id

Order: #sys.inputs.order_number
Destination: #sys.inputs.destination

#for box in sys.inputs.boxes {
  - Box #box.id: #box.contents (#box.qty)
}

Prepared by: #sys.inputs.prepared_by`,
    lowCodeSpec: {
      version: 1,
      meta: { page: "a4", margin: "18pt" },
      blocks: [
        {
          type: "header",
          props: {
            title: "{{packing.title}}",
            subtitle: "{{packing.order}}",
            align: "left",
          },
        },
        {
          type: "paragraph",
          props: {
            text: "{{packing.destination}}",
          },
        },
        { type: "divider" },
        {
          type: "line_items_table",
          props: {
            title: "Packed items",
            items_path: "boxes",
            columns: ["description", "qty"],
          },
        },
      ],
    },
    data: `{
  "packing": {
    "title": "Packing List PK-9982",
    "order": "Order #SO-8191",
    "destination": "Nashville DC"
  },
  "boxes": [
    { "description": "Box 1 - Jacket SKUs", "qty": 24 },
    { "description": "Box 2 - Hats SKUs", "qty": 36 }
  ]
}`,
    seoTitle: "Packing List Template PDF | DocuForge Playground",
    seoDescription:
      "Generate a clean packing list template with carton contents, destination info, and live PDF preview.",
  },
  {
    id: "quote-proposal",
    slug: "sales-quote-template",
    category: "finance",
    title: "Sales Quote",
    description: "Client-ready quote template with pricing breakdown and terms.",
    tags: ["quote", "proposal", "sales", "pricing"],
    icon: "quote",
    hints: [
      "Keep acceptance terms short and explicit.",
      "Use line descriptions your buyer can approve quickly.",
    ],
    source: `#set page(paper: "a4", margin: 16pt)
#set text(font: "Inter", size: 10pt)

= Quote #sys.inputs.quote_id

Prepared for: #sys.inputs.client_name
Valid until: #sys.inputs.valid_until

#for line in sys.inputs.lines {
  - #line.name (#line.qty) ..... $ #line.total
}

#align(right)[*Quoted total:* $ #sys.inputs.total]`,
    lowCodeSpec: {
      version: 1,
      meta: { page: "a4", margin: "18pt" },
      blocks: [
        {
          type: "header",
          props: {
            title: "{{quote.title}}",
            subtitle: "{{quote.client}}",
            align: "left",
          },
        },
        {
          type: "paragraph",
          props: {
            text: "{{quote.validity}}",
          },
        },
        { type: "divider" },
        {
          type: "line_items_table",
          props: {
            title: "Quote items",
            items_path: "lines",
            columns: ["name", "qty", "price", "total"],
          },
        },
      ],
    },
    data: `{
  "quote": {
    "title": "Quote Q-2026-77",
    "client": "Blue Harbor Foods",
    "validity": "Valid for 30 days"
  },
  "lines": [
    { "name": "Warehouse integration", "qty": 1, "price": 2400.0, "total": 2400.0 },
    { "name": "Support package", "qty": 1, "price": 600.0, "total": 600.0 }
  ]
}`,
    seoTitle: "Sales Quote Template PDF | DocuForge Playground",
    seoDescription:
      "Create a sales quote template with client pricing, quote validity, and export-ready PDF formatting.",
  },
  {
    id: "completion-certificate",
    slug: "completion-certificate-template",
    category: "compliance",
    title: "Completion Certificate",
    description: "Completion certificate for training, onboarding, and safety workflows.",
    tags: ["certificate", "completion", "training", "hr"],
    icon: "certificate",
    hints: [
      "Set recipient and course name as first edits.",
      "Use the date field to generate batches from one template.",
    ],
    source: `#set page(paper: "a4", margin: 20pt)
#set text(font: "Inter", size: 12pt)

#align(center)[
  = Certificate of Completion

  This certifies that
  *#sys.inputs.recipient*

  completed
  #sys.inputs.program

  Date: #sys.inputs.issued_on
]`,
    lowCodeSpec: {
      version: 1,
      meta: { page: "a4", margin: "24pt" },
      blocks: [
        {
          type: "header",
          props: {
            title: "{{certificate.title}}",
            subtitle: "{{certificate.subtitle}}",
            align: "center",
          },
        },
        {
          type: "paragraph",
          props: {
            text: "{{certificate.body}}",
          },
        },
      ],
    },
    data: `{
  "certificate": {
    "title": "Certificate of Completion",
    "subtitle": "Issued to Jordan Rivera",
    "body": "Jordan Rivera completed Warehouse Safety Operations on 2026-02-20."
  }
}`,
    seoTitle: "Completion Certificate Template PDF | DocuForge Playground",
    seoDescription:
      "Use this completion certificate template to generate branded training certificates with live PDF preview.",
  },
  {
    id: "service-report",
    slug: "service-report-template",
    category: "operations",
    title: "Service Completion Report",
    description: "Field-service completion report for work orders and signoff.",
    tags: ["service report", "work order", "completion", "ops"],
    icon: "document",
    hints: [
      "Use checklist-style bullet lines for faster field entry.",
      "Keep technician and customer signoff visible on page one.",
    ],
    source: `#set page(paper: "a4", margin: 16pt)
#set text(font: "Inter", size: 10pt)

= Service Report #sys.inputs.report_id

Technician: #sys.inputs.technician
Customer: #sys.inputs.customer
Work order: #sys.inputs.work_order

#for item in sys.inputs.tasks {
  - #item
}

Outcome: #sys.inputs.outcome`,
    lowCodeSpec: {
      version: 1,
      meta: { page: "a4", margin: "18pt" },
      blocks: [
        {
          type: "header",
          props: {
            title: "{{report.title}}",
            subtitle: "{{report.customer}}",
            align: "left",
          },
        },
        {
          type: "paragraph",
          props: {
            text: "{{report.summary}}",
          },
        },
      ],
    },
    data: `{
  "report": {
    "title": "Service Report SR-301",
    "customer": "Nova Clinics",
    "summary": "Work order WO-1189 completed by onsite team"
  }
}`,
    seoTitle: "Service Completion Report Template | DocuForge Playground",
    seoDescription:
      "Generate service completion reports with task summaries, outcomes, and technician signoff-ready PDF output.",
  },
  {
    id: "nda-agreement",
    slug: "nda-agreement-template",
    category: "legal",
    title: "NDA Agreement",
    description: "Simple mutual NDA structure for early vendor/client sharing.",
    tags: ["nda", "agreement", "legal", "contract"],
    icon: "document",
    hints: [
      "Keep parties and term length explicit.",
      "Use this draft as a starting point before legal review.",
    ],
    source: `#set page(paper: "a4", margin: 16pt)
#set text(font: "Inter", size: 10pt)

= Mutual NDA

This agreement is made between #sys.inputs.party_a and #sys.inputs.party_b.

Purpose: #sys.inputs.purpose
Term: #sys.inputs.term

#for clause in sys.inputs.clauses {
  - #clause
}

Governing law: #sys.inputs.governing_law`,
    lowCodeSpec: {
      version: 1,
      meta: { page: "a4", margin: "18pt" },
      blocks: [
        {
          type: "header",
          props: {
            title: "{{nda.title}}",
            subtitle: "{{nda.parties}}",
            align: "left",
          },
        },
        {
          type: "paragraph",
          props: {
            text: "{{nda.summary}}",
          },
        },
      ],
    },
    data: `{
  "nda": {
    "title": "Mutual NDA",
    "parties": "DocuForge Inc. and Riverline Partners",
    "summary": "Confidentiality period: 24 months"
  }
}`,
    seoTitle: "Mutual NDA Template PDF | DocuForge Playground",
    seoDescription:
      "Start from this mutual NDA PDF template and customize parties, term, clauses, and governing law.",
  },
  {
    id: "latex-heavy-report",
    slug: "technical-report-template",
    category: "compliance",
    title: "Technical Report (Math-Heavy)",
    description: "Equation-ready report starter for technical and research docs.",
    tags: ["technical report", "math", "research", "latex"],
    icon: "document",
    hints: [
      "Use this when your document needs equations and references.",
      "Keep section names stable so teams can version reports cleanly.",
    ],
    source: `#set page(paper: "a4", margin: 16pt)
#set text(font: "Inter", size: 10pt)

= #sys.inputs.title

Author: #sys.inputs.author

== Abstract
#sys.inputs.abstract

== Model
$ f(x) = a x^2 + b x + c $

== Findings
#for finding in sys.inputs.findings {
  - #finding
}`,
    lowCodeSpec: {
      version: 1,
      meta: { page: "a4", margin: "18pt" },
      blocks: [
        {
          type: "header",
          props: {
            title: "{{report.title}}",
            subtitle: "{{report.author}}",
            align: "left",
          },
        },
        {
          type: "paragraph",
          props: {
            text: "{{report.abstract}}",
          },
        },
      ],
    },
    data: `{
  "report": {
    "title": "Freight Cost Optimization Report",
    "author": "Operations Analytics Team",
    "abstract": "Quarterly model update for lane-level freight optimization."
  }
}`,
    seoTitle: "Technical Report Template (Math Ready) | DocuForge Playground",
    seoDescription:
      "Use this technical report PDF template for equation-heavy documents, analytics summaries, and research deliverables.",
  },
];

export function cloneSpec(spec: LowCodeSpec): LowCodeSpec {
  return JSON.parse(JSON.stringify(spec)) as LowCodeSpec;
}

export function getHeaderBlock(spec: LowCodeSpec): HeaderBlock | undefined {
  return spec.blocks.find((block): block is HeaderBlock => block.type === "header");
}

export function getParagraphBlock(spec: LowCodeSpec): ParagraphBlock | undefined {
  return spec.blocks.find((block): block is ParagraphBlock => block.type === "paragraph");
}

export function getLineItemsBlock(spec: LowCodeSpec): LineItemsBlock | undefined {
  return spec.blocks.find((block): block is LineItemsBlock => block.type === "line_items_table");
}

export function getPlaygroundPresetBySlug(slug: string): PlaygroundPreset | undefined {
  return playgroundPresets.find((preset) => preset.slug === slug || preset.id === slug);
}

export function listPlaygroundPresetSlugs(): string[] {
  return playgroundPresets.map((preset) => preset.slug);
}
