"""Generate Wyra Dashboard QA Test Guide as a .docx (stdlib only)."""
from __future__ import annotations

import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path(__file__).resolve().parent / "Wyra-Dashboard-QA-Test-Guide.docx"


def p(text: str, size: int = 22, bold: bool = False) -> str:
    b = "<w:b/>" if bold else ""
    return (
        "<w:p><w:r>"
        f"<w:rPr>{b}<w:sz w:val=\"{size}\"/><w:szCs w:val=\"{size}\"/></w:rPr>"
        f'<w:t xml:space="preserve">{escape(text)}</w:t>'
        "</w:r></w:p>"
    )


def h(text: str, size: int = 28) -> str:
    return p(text, size=size, bold=True)


def blank() -> str:
    return "<w:p><w:r><w:t></w:t></w:r></w:p>"


CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
"""

RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""

body_parts: list[str] = [
    h("Dashboard QA Test Guide — Wyra Client Tracker", 36),
    p("Document for Testing Team", bold=True),
    blank(),
    p("Who: Testers with Dashboard View permission (and View on modules whose data should appear)."),
    p("Where: Sidebar → Dashboard"),
    p("Note: Each number card shows Count (big number) + Amount (below, in the selected display currency)."),
    blank(),
    h("1. Global controls (test first)"),
    p("Control | Purpose | How to test", bold=True),
    p("Show in USD/INR/EUR… | Converts all amounts into one display currency | Change currency → all card amounts and chart axes update"),
    p("FX banner | Shows today's rates (or fallback warning) | Should show rates; if warning appears, amounts still convert using fallback"),
    p("Download detailed report | Excel with Summary + detail sheets | Download → open file → Summary KPIs match on-screen totals (no Applied filters section)"),
    p("Month / Year filters | Each section has its own filter | Changing Clients filter must NOT change Invoices/Expenses filters"),
    blank(),
    p("Permission check: User without Client Tracker view → client charts empty/zero but Dashboard still opens. Same idea for Paid/Open/Expenses."),
    blank(),
    h("2. Clients section"),
    p("Data source: Client Tracker (onboardings)", bold=True),
    p("Card / Chart | Purpose | How to test", bold=True),
    p("Total clients | How many clients after month/year filter + sum of committed amounts | Compare count to Client Tracker rows for that period"),
    p("Statuses tracked | How many different statuses exist + total committed for those | Count unique statuses in Client Tracker"),
    p("Months with signups | How many months have at least one signup (in filter) | With All/All, count distinct onboarding months"),
    p("Overall clients (donut) | Split by status | Hover slice → clients count + amount; Active/Closed match data"),
    p("Month-wise clients (bars) | New clients by onboarding month | Bar height = new clients that month; hover shows amount"),
    blank(),
    p("Filter tests: Pick a month+year with known clients → Total clients drops; charts shrink. All months/All years → full set."),
    blank(),
    h("3. Invoices section"),
    p("Data source: Paid Invoices + Open Invoices. Rule: Raised = Paid + Pending", bold=True),
    p("Card / Chart | Purpose | How to test", bold=True),
    p("Total invoices raised | All paid + open invoices (count + amount) | Raised count ≈ Paid count + Pending count"),
    p("Paid invoices | Paid only | Match Paid Invoices tab for same month/year"),
    p("Pending invoices | Open/unpaid only | Match Open Invoices tab"),
    p("Invoices by month (bars) | Raised / Paid / Pending amounts by month | Blue=Raised, Green=Paid, Amber=Pending; hover shows money"),
    blank(),
    p("Filter tests: Filter a month → cards/charts only that month. Currency: Invoice in INR while display=USD → amount changes when FX works/fallback."),
    blank(),
    h("4. Expenses section"),
    p("Data source: Expenses tab", bold=True),
    p("Card / Chart | Purpose | How to test", bold=True),
    p("Total expenses | Expense row count + total spend | Match Expenses list for filtered period"),
    p("Tools with spend | Distinct tools that have spend | Compare to unique tool names in Expenses"),
    p("Months with expenses | Months that have at least 1 expense | Distinct invoice months in Expenses"),
    p("Expenses by tool (donut) | Spend share by tool | Hover → amount + row count for that tool"),
    p("Expenses by month (bars) | Spend per month | Hover → amount + row count"),
    blank(),
    p("Filter tests: Month/year filter only affects this section."),
    blank(),
    h("5. 6-month forecast"),
    p(
        "Data source: Onboarding & Invoices (invoice amount × cycle; paid ratio from history). "
        "No month filter — always next 6 calendar months.",
        bold=True,
    ),
    p("Card / Chart | Purpose | How to test", bold=True),
    p("Forecast raised (6 mo) | Expected invoices next 6 months | Needs clients with amount + cycle; else empty message"),
    p("Forecast paid (6 mo) | Expected paid portion | Should be ≤ raised"),
    p("Forecast pending (6 mo) | Expected unpaid portion | Raised ≈ Paid + Pending (approx)"),
    p("Future invoices & amounts | Month-by-month forecast bars | Exactly 6 month labels ahead; empty state if no cycle/amount data"),
    blank(),
    p("Setup for forecast test: In Onboarding & Invoices, set invoice amount + cycle on a few clients → Dashboard forecast should show bars."),
    blank(),
    h("6. Suggested smoke checklist (Pass / Fail)"),
    p("[ ] 1. Open Dashboard as Admin → all 4 sections load without red permission error"),
    p("[ ] 2. Switch display currency USD → INR → amounts change"),
    p("[ ] 3. Clients month filter → only Clients section changes"),
    p("[ ] 4. Invoices: Raised count = Paid + Pending (same filter)"),
    p("[ ] 5. Expenses filter → only Expenses section changes"),
    p("[ ] 6. Download Excel → Summary matches Total clients / invoices / expenses cards"),
    p("[ ] 7. Member with Dashboard + Expenses only → no Client Tracker error; expense cards show; client cards empty/zero"),
    p("[ ] 8. Forecast empty message when no amount/cycle; bars appear after adding them"),
    blank(),
    h("7. Quick map"),
    p("Clients cards → who we onboarded + committed money"),
    p("Invoice cards → money billed / collected / still due"),
    p("Expense cards → tool spend"),
    p("Forecast cards → expected billing next 6 months"),
    blank(),
    p("End of document — Wyra Client Tracker Dashboard QA Guide"),
]

document_xml = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    "<w:body>"
    + "".join(body_parts)
    + "<w:sectPr/></w:body></w:document>"
)

OUT.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    zf.writestr("[Content_Types].xml", CONTENT_TYPES)
    zf.writestr("_rels/.rels", RELS)
    zf.writestr("word/document.xml", document_xml)

print(f"Created: {OUT}")
