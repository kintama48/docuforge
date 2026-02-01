// Data-intensive template testing loops, conditions, nested access, formatting
#set page(paper: "a4", margin: 2cm)
#set text(font: "Inter", size: 10pt)
#set par(justify: true)

// Helper functions for formatting
#let format-currency(amount) = {
  let rounded = calc.round(amount, digits: 2)
  [\$#rounded]
}

#let format-date(date-str) = {
  // Date is passed as string, just display it
  text(weight: "medium")[#date-str]
}

#let format-percent(value) = {
  let pct = calc.round(value * 100, digits: 1)
  [#pct%]
}

#let status-badge(status) = {
  let (bg, fg) = if status == "active" {
    (rgb("#dcfce7"), rgb("#166534"))
  } else if status == "pending" {
    (rgb("#fef9c3"), rgb("#854d0e"))
  } else if status == "completed" {
    (rgb("#dbeafe"), rgb("#1e40af"))
  } else {
    (rgb("#fee2e2"), rgb("#991b1b"))
  }
  box(
    fill: bg,
    inset: (x: 6pt, y: 3pt),
    radius: 3pt,
  )[#text(fill: fg, size: 8pt, weight: "medium")[#upper(status)]]
}

// =============================================================================
// HEADER
// =============================================================================

#align(center)[
  #text(size: 24pt, weight: "bold")[#sys.inputs.report.title]
  #v(0.5em)
  #text(size: 12pt, fill: gray)[Generated: #format-date(sys.inputs.report.generated_date)]
  #v(0.3em)
  #text(size: 10pt)[Period: #sys.inputs.report.period.start to #sys.inputs.report.period.end]
]

#v(1em)
#line(length: 100%, stroke: 1pt + luma(200))
#v(1em)

// =============================================================================
// EXECUTIVE SUMMARY WITH CONDITIONALS
// =============================================================================

= Executive Summary

#let total-revenue = sys.inputs.financial.revenue
#let total-expenses = sys.inputs.financial.expenses
#let profit = total-revenue - total-expenses
#let profit-margin = profit / total-revenue

Revenue for this period: #format-currency(total-revenue)

Expenses: #format-currency(total-expenses)

#if profit > 0 [
  *Profit: #format-currency(profit)* (Margin: #format-percent(profit-margin))

  #text(fill: green)[The business is operating profitably.]
] else if profit == 0 [
  *Break Even*

  #text(fill: orange)[The business broke even this period.]
] else [
  *Loss: #format-currency(calc.abs(profit))*

  #text(fill: red)[Action required: The business is operating at a loss.]
]

#v(1em)

// =============================================================================
// DEPARTMENT BREAKDOWN - LOOP WITH NESTED ACCESS
// =============================================================================

= Department Performance

#for dept in sys.inputs.departments [
  == #dept.name

  #grid(
    columns: (1fr, 1fr, 1fr),
    gutter: 1em,

    [
      *Head Count:* #dept.employees.count \
      *Budget:* #format-currency(dept.budget.allocated) \
      *Spent:* #format-currency(dept.budget.spent)
    ],
    [
      *Revenue:* #format-currency(dept.metrics.revenue) \
      *Target:* #format-currency(dept.metrics.target) \
      *Achievement:* #if dept.metrics.target > 0 [#format-percent(dept.metrics.revenue / dept.metrics.target)] else [N/A]
    ],
    [
      *Status:* #status-badge(dept.status) \
      *YoY Growth:* #format-percent(dept.metrics.yoy_growth)
    ],
  )

  #if dept.projects != none and dept.projects.len() > 0 [
    #v(0.5em)
    *Active Projects:*
    #table(
      columns: (2fr, 1fr, 1fr, auto),
      stroke: 0.5pt + luma(200),
      inset: 6pt,
      fill: (x, y) => if y == 0 { luma(240) } else { white },

      [*Project*], [*Budget*], [*Progress*], [*Status*],

      ..dept.projects.map(proj => (
        proj.name,
        format-currency(proj.budget),
        format-percent(proj.progress),
        status-badge(proj.status),
      )).flatten()
    )
  ]

  #v(1em)
]

#pagebreak()

// =============================================================================
// EMPLOYEE ROSTER - ARRAY ITERATION WITH INDEX
// =============================================================================

= Employee Directory

#let employees = sys.inputs.employees

Total Employees: #employees.len()

#table(
  columns: (auto, 2fr, 1fr, 1fr, auto, auto),
  stroke: 0.5pt + luma(200),
  inset: 7pt,
  align: (center, left, left, left, right, center),
  fill: (x, y) => if y == 0 { luma(235) } else if calc.odd(y) { white } else { luma(252) },

  [*\#*], [*Name*], [*Department*], [*Title*], [*Salary*], [*Status*],

  ..employees.enumerate().map(((i, emp)) => (
    str(i + 1),
    [#emp.first_name #emp.last_name],
    emp.department,
    emp.title,
    format-currency(emp.salary),
    status-badge(emp.status),
  )).flatten()
)

#v(1em)

// =============================================================================
// STATISTICAL ANALYSIS - NUMBER FORMATTING
// =============================================================================

= Statistical Analysis

#let stats = sys.inputs.statistics

#grid(
  columns: (1fr, 1fr),
  gutter: 2em,

  [
    == Sales Metrics
    #table(
      columns: (1fr, auto),
      stroke: none,
      inset: 5pt,

      [Total Sales:], [*#stats.sales.total* units],
      [Average Order:], [*#format-currency(stats.sales.average_order)*],
      [Largest Order:], [*#format-currency(stats.sales.largest_order)*],
      [Smallest Order:], [*#format-currency(stats.sales.smallest_order)*],
      [Median Order:], [*#format-currency(stats.sales.median_order)*],
      [Std Deviation:], [*#format-currency(stats.sales.std_deviation)*],
    )
  ],

  [
    == Customer Metrics
    #table(
      columns: (1fr, auto),
      stroke: none,
      inset: 5pt,

      [Total Customers:], [*#stats.customers.total*],
      [New Customers:], [*#stats.customers.new*],
      [Returning:], [*#stats.customers.returning*],
      [Churn Rate:], [*#format-percent(stats.customers.churn_rate)*],
      [NPS Score:], [*#stats.customers.nps_score*],
      [Satisfaction:], [*#format-percent(stats.customers.satisfaction)*],
    )
  ],
)

#v(1em)

// =============================================================================
// TIME SERIES DATA - COMPLEX NESTED ITERATION
// =============================================================================

= Monthly Breakdown

#for month in sys.inputs.monthly_data [
  == #month.month #month.year

  #grid(
    columns: (1fr, 1fr, 1fr, 1fr),
    gutter: 1em,

    [
      *Revenue* \
      #text(size: 14pt, weight: "bold")[#format-currency(month.revenue)]
    ],
    [
      *Expenses* \
      #text(size: 14pt, weight: "bold")[#format-currency(month.expenses)]
    ],
    [
      *Profit* \
      #text(size: 14pt, weight: "bold", fill: if month.revenue > month.expenses { green } else { red })[
        #format-currency(month.revenue - month.expenses)
      ]
    ],
    [
      *Transactions* \
      #text(size: 14pt, weight: "bold")[#month.transactions]
    ],
  )

  #if month.notes != none [
    #text(size: 9pt, fill: gray)[_Note: #month.notes _]
  ]

  #v(0.5em)
]

// =============================================================================
// PRODUCT CATALOG - DEEP NESTING
// =============================================================================

#pagebreak()

= Product Catalog

#for category in sys.inputs.products.categories [
  == #category.name
  #text(size: 9pt, fill: gray)[#category.description]

  #v(0.5em)

  #for subcategory in category.subcategories [
    === #subcategory.name

    #table(
      columns: (auto, 2fr, auto, auto, auto),
      stroke: 0.5pt + luma(200),
      inset: 6pt,
      fill: (x, y) => if y == 0 { luma(240) } else { white },

      [*SKU*], [*Product*], [*Price*], [*Stock*], [*Status*],

      ..subcategory.products.map(prod => (
        prod.sku,
        [
          #prod.name
          #if prod.on_sale [
            #h(5pt)
            #box(fill: red.lighten(80%), inset: 2pt, radius: 2pt)[
              #text(size: 7pt, fill: red)[SALE]
            ]
          ]
        ],
        [
          #if prod.on_sale [
            #strike[#text(fill: gray)[#format-currency(prod.original_price)]]
            #h(3pt)
          ]
          #text(weight: "bold")[#format-currency(prod.price)]
        ],
        [
          #if prod.stock < 10 [
            #text(fill: red)[#prod.stock]
          ] else [
            #prod.stock
          ]
        ],
        status-badge(prod.status),
      )).flatten()
    )

    #v(0.5em)
  ]
]

// =============================================================================
// SPECIAL CHARACTERS AND UNICODE TEST
// =============================================================================

#pagebreak()

= Special Characters Test

This section tests various special characters and unicode handling.

#table(
  columns: (1fr, 2fr),
  stroke: 0.5pt + luma(200),
  inset: 8pt,

  [*Type*], [*Content*],

  ..sys.inputs.special_characters.map(item => (
    item.type,
    item.content,
  )).flatten()
)

// =============================================================================
// CONDITIONAL SECTIONS
// =============================================================================

#if sys.inputs.include_appendix [
  #pagebreak()

  = Appendix

  #for (i, appendix) in sys.inputs.appendices.enumerate() [
    == #numbering("A", i + 1). #appendix.title

    #appendix.content

    #v(1em)
  ]
]

// =============================================================================
// FOOTER SUMMARY
// =============================================================================

#v(1fr)

#line(length: 100%, stroke: 0.5pt + luma(200))
#v(0.5em)

#grid(
  columns: (1fr, 1fr, 1fr),
  gutter: 1em,

  [
    #text(size: 8pt, fill: gray)[
      Report ID: #sys.inputs.report.id \
      Version: #sys.inputs.report.version
    ]
  ],
  [
    #align(center)[
      #text(size: 8pt, fill: gray)[
        #if sys.inputs.report.confidential [
          *CONFIDENTIAL*
        ] else [
          *PUBLIC*
        ]
      ]
    ]
  ],
  [
    #align(right)[
      #text(size: 8pt, fill: gray)[
        Generated by DocuForge \
        #sys.inputs.report.generated_date
      ]
    ]
  ],
)
