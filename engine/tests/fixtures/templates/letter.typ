#set page(paper: "us-letter", margin: (top: 2cm, bottom: 2cm, left: 2.5cm, right: 2.5cm))
#set text(size: 12pt)

#align(right)[
  #sys.inputs.date
]

#v(2em)

#sys.inputs.recipient.name\
#sys.inputs.recipient.address

#v(1.5em)

Dear #sys.inputs.recipient.name,

#v(1em)

#sys.inputs.body

#v(2em)

Sincerely,

#v(1em)

#sys.inputs.sender.name\
#sys.inputs.sender.title
