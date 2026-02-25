export function createPublicPreviewPayload() {
  return {
    source: `#set page(paper: "a4", margin: 14pt)
#set text(font: "Inter", size: 10pt)

= Freight Invoice #sys.inputs.invoice_id

Customer: #sys.inputs.customer_name
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
    files: {},
    data: {
      invoice_id: "FRT-K6-2026-001",
      customer_name: "Northbound Distribution",
      origin: "Dallas, TX",
      destination: "Memphis, TN",
      date: "2026-02-25",
      subtotal: 780,
      fuel_surcharge: 45,
      total_due: 825,
      lines: [
        { label: "Linehaul (LTL)", qty: 1, amount: 780 },
        { label: "Fuel surcharge", qty: 1, amount: 45 },
      ],
    },
  };
}
