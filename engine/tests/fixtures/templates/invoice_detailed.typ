// Professional detailed invoice template with all features
#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2.5cm, left: 2cm, right: 2cm),
  footer: context [
    #set align(center)
    #set text(size: 9pt, fill: gray)
    Page #counter(page).display() of #counter(page).final().first()
    #h(1fr)
    Invoice \##sys.inputs.invoice_number
  ],
)
#set text(font: "Inter", size: 10pt)

// Header with company info and logo placeholder
#grid(
  columns: (1fr, auto),
  gutter: 2em,
  [
    #text(size: 20pt, weight: "bold")[#sys.inputs.company.name]

    #text(size: 9pt, fill: gray)[
      #sys.inputs.company.address \
      #sys.inputs.company.city, #sys.inputs.company.state #sys.inputs.company.zip \
      Phone: #sys.inputs.company.phone \
      Email: #sys.inputs.company.email \
      #if sys.inputs.company.website != none [Website: #sys.inputs.company.website]
    ]
  ],
  [
    #align(right)[
      #rect(
        width: 80pt,
        height: 60pt,
        stroke: 1pt + gray,
        fill: luma(245),
        align(center + horizon, text(size: 8pt, fill: gray)[LOGO PLACEHOLDER])
      )
    ]
  ],
)

#v(1.5em)
#line(length: 100%, stroke: 0.5pt + gray)
#v(1em)

// Invoice title and details
#grid(
  columns: (1fr, auto),
  gutter: 2em,
  [
    #text(size: 24pt, weight: "bold", fill: rgb("#2563eb"))[INVOICE]

    #v(1em)

    *Bill To:*
    #block(inset: (left: 0.5em))[
      #text(weight: "bold")[#sys.inputs.customer.name] \
      #sys.inputs.customer.company \
      #sys.inputs.customer.address \
      #sys.inputs.customer.city, #sys.inputs.customer.state #sys.inputs.customer.zip \
      #if sys.inputs.customer.email != none [Email: #sys.inputs.customer.email]
    ]
  ],
  [
    #align(right)[
      #table(
        columns: (auto, auto),
        stroke: none,
        align: (left, right),
        inset: 5pt,
        [Invoice Number:], [*#sys.inputs.invoice_number*],
        [Invoice Date:], [#sys.inputs.invoice_date],
        [Due Date:], [*#sys.inputs.due_date*],
        [PO Number:], [#sys.inputs.po_number],
      )
    ]
  ],
)

#v(2em)

// Line items table
#table(
  columns: (auto, 1fr, auto, auto, auto),
  stroke: (x, y) => if y == 0 { (bottom: 1pt + black) } else { (bottom: 0.5pt + luma(220)) },
  inset: 8pt,
  align: (center, left, right, right, right),
  fill: (x, y) => if y == 0 { luma(245) } else if calc.odd(y) { white } else { luma(252) },

  // Header row
  [*\#*], [*Description*], [*Qty*], [*Unit Price*], [*Amount*],

  // Line items - iterate with index
  ..{
    let items = sys.inputs.items
    let result = ()
    for (i, item) in items.enumerate() {
      result.push(str(i + 1))
      result.push([
        #item.name
        #if item.description != none [
          #linebreak()
          #text(size: 8pt, fill: gray)[#item.description]
        ]
      ])
      result.push(str(item.quantity))
      result.push([\$#calc.round(item.unit_price, digits: 2)])
      result.push([*\$#calc.round(item.quantity * item.unit_price, digits: 2)*])
    }
    result
  }
)

#v(1em)

// Totals section
#align(right)[
  #table(
    columns: (auto, auto),
    stroke: none,
    align: (left, right),
    inset: 6pt,
    [Subtotal:], [\$#calc.round(sys.inputs.subtotal, digits: 2)],
    [#if sys.inputs.discount_percent > 0 [Discount (#sys.inputs.discount_percent%):] else [Discount:]],
    [#if sys.inputs.discount_amount > 0 [(-\$#calc.round(sys.inputs.discount_amount, digits: 2))] else [--]],
    [Tax (#sys.inputs.tax_rate%):], [\$#calc.round(sys.inputs.tax_amount, digits: 2)],
    [Shipping:], [#if sys.inputs.shipping > 0 [\$#calc.round(sys.inputs.shipping, digits: 2)] else [FREE]],
  )
  #line(length: 150pt, stroke: 1pt + black)
  #table(
    columns: (auto, auto),
    stroke: none,
    align: (left, right),
    inset: 6pt,
    [*TOTAL DUE:*], [*\$#calc.round(sys.inputs.total, digits: 2)*],
  )
]

#v(2em)

// Payment terms
#rect(
  width: 100%,
  stroke: 1pt + luma(200),
  inset: 12pt,
  fill: luma(250),
)[
  *Payment Terms:* #sys.inputs.payment_terms

  #v(0.5em)

  #text(size: 9pt)[
    *Accepted Payment Methods:* #sys.inputs.payment_methods.join(", ")

    #if sys.inputs.bank_details != none [
      #v(0.5em)
      *Bank Transfer Details:*
      - Bank: #sys.inputs.bank_details.bank_name
      - Account Name: #sys.inputs.bank_details.account_name
      - Account Number: #sys.inputs.bank_details.account_number
      - Routing Number: #sys.inputs.bank_details.routing_number
    ]
  ]
]

#v(1.5em)

// Notes section
#if sys.inputs.notes != none [
  *Notes:*
  #block(inset: (left: 0.5em))[
    #text(size: 9pt)[#sys.inputs.notes]
  ]
]

#v(1fr)

// Footer thank you message
#align(center)[
  #text(size: 10pt, weight: "medium", fill: rgb("#2563eb"))[
    Thank you for your business!
  ]
]
