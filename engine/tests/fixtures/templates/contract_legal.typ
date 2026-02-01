// Legal contract template with proper formatting
#set page(
  paper: "us-letter",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 3cm, right: 3cm),
  footer: context [
    #set align(center)
    #set text(size: 9pt, fill: gray)
    #line(length: 100%, stroke: 0.5pt + luma(200))
    #v(0.3em)
    #sys.inputs.contract_title | Page #counter(page).display() of #counter(page).final().first()
  ],
)

#set text(font: "Inter", size: 11pt)
#set par(justify: true, leading: 0.7em, first-line-indent: 0em)

// Counter for clause numbering
#let clause-counter = counter("clause")
#let subclause-counter = counter("subclause")

// Helper for main clauses
#let clause(title, content) = {
  clause-counter.step()
  subclause-counter.update(0)
  v(1em)
  block(above: 1em)[
    #text(weight: "bold")[
      #context clause-counter.display(). #upper(title)
    ]
  ]
  v(0.5em)
  content
}

// Helper for subclauses
#let subclause(content) = {
  subclause-counter.step()
  block(inset: (left: 1.5em), above: 0.5em)[
    #context [#clause-counter.display().#subclause-counter.display()] #content
  ]
}

// =============================================================================
// CONTRACT HEADER
// =============================================================================

#align(center)[
  #text(size: 18pt, weight: "bold")[#upper(sys.inputs.contract_title)]

  #v(0.5em)

  #text(size: 11pt)[Contract Number: #sys.inputs.contract_number]

  #v(1em)

  #line(length: 30%, stroke: 1pt)
]

#v(2em)

// =============================================================================
// PARTIES
// =============================================================================

#text(weight: "bold")[THIS #upper(sys.inputs.contract_type)] (the "Agreement") is entered into as of #sys.inputs.effective_date (the "Effective Date"), by and between:

#v(1em)

#block(inset: (left: 2em))[
  *#sys.inputs.party_a.name*
  #if sys.inputs.party_a.entity_type != none [, a #sys.inputs.party_a.entity_type]
  , with its principal place of business at #sys.inputs.party_a.address
  (hereinafter referred to as "#sys.inputs.party_a.short_name" or "First Party")

  #v(0.5em)

  AND

  #v(0.5em)

  *#sys.inputs.party_b.name*
  #if sys.inputs.party_b.entity_type != none [, a #sys.inputs.party_b.entity_type]
  , with its principal place of business at #sys.inputs.party_b.address
  (hereinafter referred to as "#sys.inputs.party_b.short_name" or "Second Party")
]

#v(1em)

Collectively referred to as the "Parties" and individually as a "Party."

#v(1em)

// =============================================================================
// RECITALS (WHEREAS CLAUSES)
// =============================================================================

#text(weight: "bold")[RECITALS]

#v(0.5em)

#for (i, recital) in sys.inputs.recitals.enumerate() [
  #block(above: 0.5em)[
    *WHEREAS*, #recital;
  ]
]

#v(0.5em)

*NOW, THEREFORE*, in consideration of the mutual covenants and agreements hereinafter set forth and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows:

#v(1em)

// =============================================================================
// CONTRACT CLAUSES
// =============================================================================

#for section in sys.inputs.clauses [
  #clause(section.title)[
    #section.content

    #if section.subclauses != none [
      #for sub in section.subclauses [
        #subclause[#sub]
      ]
    ]
  ]
]

// =============================================================================
// STANDARD LEGAL CLAUSES
// =============================================================================

#clause("Term and Termination")[
  This Agreement shall commence on the Effective Date and shall continue for a period of #sys.inputs.term_length (the "Initial Term"), unless earlier terminated in accordance with this Agreement.

  #subclause[Either Party may terminate this Agreement for convenience upon #sys.inputs.notice_period days' prior written notice to the other Party.]

  #subclause[Either Party may terminate this Agreement immediately upon written notice if the other Party materially breaches any provision of this Agreement and fails to cure such breach within #sys.inputs.cure_period days after receipt of written notice thereof.]

  #subclause[Upon termination or expiration of this Agreement, all rights and obligations of the Parties shall cease, except for those provisions which by their nature are intended to survive termination.]
]

#clause("Confidentiality")[
  Each Party agrees to maintain in strict confidence all Confidential Information of the other Party and not to disclose such information to any third party without the prior written consent of the disclosing Party.

  #subclause["Confidential Information" means any non-public information, technical data, or know-how disclosed by one Party to the other, whether orally or in writing.]

  #subclause[The obligations of confidentiality shall not apply to information that: (a) is or becomes publicly available through no fault of the receiving Party; (b) was in the receiving Party's possession prior to disclosure; (c) is independently developed by the receiving Party; or (d) is required to be disclosed by law.]
]

#clause("Limitation of Liability")[
  IN NO EVENT SHALL EITHER PARTY BE LIABLE TO THE OTHER FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, REGARDLESS OF WHETHER SUCH DAMAGES WERE FORESEEABLE.

  #subclause[The total liability of either Party under this Agreement shall not exceed #sys.inputs.liability_cap.]
]

#clause("Governing Law")[
  This Agreement shall be governed by and construed in accordance with the laws of #sys.inputs.governing_law, without regard to its conflict of law principles.

  #subclause[Any dispute arising out of or relating to this Agreement shall be resolved through #sys.inputs.dispute_resolution.]
]

#clause("General Provisions")[
  #subclause[*Entire Agreement.* This Agreement constitutes the entire agreement between the Parties concerning the subject matter hereof and supersedes all prior agreements, understandings, negotiations, and discussions.]

  #subclause[*Amendment.* This Agreement may not be amended except by a written instrument signed by both Parties.]

  #subclause[*Waiver.* No waiver of any provision of this Agreement shall be effective unless in writing and signed by the waiving Party.]

  #subclause[*Severability.* If any provision of this Agreement is held to be invalid or unenforceable, such provision shall be struck and the remaining provisions shall remain in full force and effect.]

  #subclause[*Counterparts.* This Agreement may be executed in counterparts, each of which shall be deemed an original and all of which together shall constitute one and the same instrument.]
]

#v(2em)

// =============================================================================
// SIGNATURE BLOCKS
// =============================================================================

*IN WITNESS WHEREOF*, the Parties have executed this Agreement as of the date first written above.

#v(2em)

#grid(
  columns: (1fr, 1fr),
  gutter: 3em,

  // Party A signature block
  [
    #text(weight: "bold")[#sys.inputs.party_a.short_name]

    #v(3em)

    #line(length: 100%, stroke: 0.5pt)
    Signature

    #v(1.5em)

    #line(length: 100%, stroke: 0.5pt)
    Print Name: #sys.inputs.party_a.signatory_name

    #v(1.5em)

    #line(length: 100%, stroke: 0.5pt)
    Title: #sys.inputs.party_a.signatory_title

    #v(1.5em)

    #line(length: 100%, stroke: 0.5pt)
    Date
  ],

  // Party B signature block
  [
    #text(weight: "bold")[#sys.inputs.party_b.short_name]

    #v(3em)

    #line(length: 100%, stroke: 0.5pt)
    Signature

    #v(1.5em)

    #line(length: 100%, stroke: 0.5pt)
    Print Name: #sys.inputs.party_b.signatory_name

    #v(1.5em)

    #line(length: 100%, stroke: 0.5pt)
    Title: #sys.inputs.party_b.signatory_title

    #v(1.5em)

    #line(length: 100%, stroke: 0.5pt)
    Date
  ],
)

#v(2em)

// =============================================================================
// WITNESS (Optional)
// =============================================================================

#if sys.inputs.requires_witness [
  #text(weight: "bold")[WITNESSES:]

  #v(1em)

  #grid(
    columns: (1fr, 1fr),
    gutter: 3em,

    [
      #v(2em)
      #line(length: 100%, stroke: 0.5pt)
      Witness Signature

      #v(1em)
      #line(length: 100%, stroke: 0.5pt)
      Print Name

      #v(1em)
      #line(length: 100%, stroke: 0.5pt)
      Date
    ],

    [
      #v(2em)
      #line(length: 100%, stroke: 0.5pt)
      Witness Signature

      #v(1em)
      #line(length: 100%, stroke: 0.5pt)
      Print Name

      #v(1em)
      #line(length: 100%, stroke: 0.5pt)
      Date
    ],
  )
]
