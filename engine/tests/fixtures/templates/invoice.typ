#set page(paper: "a4", margin: 2cm)
#set text(size: 11pt)

#align(center)[
  = Invoice \##sys.inputs.invoice_id
]

#v(1em)

*From:* DocuForge Inc.\
*Date:* #sys.inputs.date

#v(1em)

*Bill To:*\
#sys.inputs.customer.name\
#sys.inputs.customer.address

#v(2em)

#table(
  columns: (1fr, auto),
  stroke: none,
  [*Description*], [*Amount*],
  ..sys.inputs.items.map(item => (item.description, [\$#item.price])).flatten()
)

#line(length: 100%)

#align(right)[
  *Total: \$#sys.inputs.total*
]
