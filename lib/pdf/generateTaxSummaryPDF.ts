import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── palette ───────────────────────────────────────────────────────────────────
type RGB = [number, number, number]
const C: Record<string, RGB> = {
  teal:   [15, 118, 110],
  slate8: [30, 41, 59],
  slate6: [71, 85, 105],
  slate5: [100, 116, 139],
  slate4: [148, 163, 184],
  slate2: [226, 232, 240],
  red:    [220, 38, 38],
  amber:  [161, 98, 7],
  green:  [21, 128, 61],
}

// ── layout constants (mm) ─────────────────────────────────────────────────────
const ML   = 20
const MR   = 190
const CW   = 170
const COL2 = MR

const CAT_LABELS: Record<string, string> = {
  supplies:  'Supplies',
  gas:       'Gas & Fuel',
  equipment: 'Equipment',
  insurance: 'Insurance',
  phone:     'Phone & Internet',
  other:     'Other',
}

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) { return `$${n.toFixed(2)}` }

function sectionTitle(doc: jsPDF, label: string, y: number): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...C.slate5)
  doc.text(label.toUpperCase(), ML, y)
  doc.setDrawColor(...C.slate2)
  doc.setLineWidth(0.3)
  doc.line(ML, y + 1.5, MR, y + 1.5)
  return y + 6
}

function row(
  doc: jsPDF,
  label: string,
  value: string,
  y: number,
  opts: { bold?: boolean; color?: RGB; labelColor?: RGB } = {},
): number {
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...(opts.labelColor ?? C.slate6))
  doc.text(label, ML, y)
  if (value) {
    doc.setTextColor(...(opts.color ?? C.slate8))
    doc.text(value, COL2, y, { align: 'right' })
  }
  return y + 5.5
}

function maybeNewPage(doc: jsPDF, y: number, needed = 25): number {
  if (y + needed > 275) { doc.addPage(); return 22 }
  return y
}

async function logoBase64(url: string): Promise<{ data: string; ext: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const ext  = blob.type.includes('png') ? 'PNG' : 'JPEG'
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve({ data: reader.result as string, ext })
      reader.onerror  = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

// ── public types ──────────────────────────────────────────────────────────────
export interface TaxSummaryPDFData {
  year: number
  business: {
    name: string
    hstNumber: string | null
    city: string | null
    province: string | null
    email: string | null
    phone: string | null
    logoUrl: string | null
  }
  revenue: {
    totalPaid: number
    invoiceCount: number
  }
  expenses: {
    total: number
    byCategory: Record<string, { amount: number; hstPaid: number }>
  }
  mileage: {
    km: number
    deduction: number
    tripCount: number
  }
  netProfit: number
}

// ── main export ───────────────────────────────────────────────────────────────
export async function generateTaxSummaryPDF(d: TaxSummaryPDFData): Promise<void> {
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const today = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
  let y = 20

  // ── logo + business header ─────────────────────────────────────────────────
  let logoFetched: { data: string; ext: string } | null = null
  if (d.business.logoUrl) logoFetched = await logoBase64(d.business.logoUrl)

  if (logoFetched) {
    try { doc.addImage(logoFetched.data, logoFetched.ext, ML, y, 28, 18) }
    catch { /* skip if image fails */ }
  }

  const nameX = logoFetched ? ML + 32 : ML
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...C.slate8)
  doc.text(d.business.name, nameX, y + 6)

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.slate5)
  let metaY = y + 11
  if (d.business.hstNumber) { doc.text(`HST #: ${d.business.hstNumber} RT`, nameX, metaY); metaY += 4.5 }
  const location = [d.business.city, d.business.province].filter(Boolean).join(', ')
  if (location)            { doc.text(location, nameX, metaY); metaY += 4.5 }
  if (d.business.email)    { doc.text(d.business.email, nameX, metaY); metaY += 4.5 }
  if (d.business.phone)    { doc.text(d.business.phone, nameX, metaY) }

  y = Math.max(y + 22, metaY + 4)
  doc.setDrawColor(...C.slate2); doc.setLineWidth(0.5); doc.line(ML, y, MR, y)
  y += 6

  // ── report title ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...C.teal)
  doc.text(`Annual Tax Summary  ${d.year}`, ML, y)
  y += 6
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...C.slate6)
  doc.text('For use with your accountant at tax time.', ML, y)
  y += 5
  doc.setFontSize(8); doc.setTextColor(...C.slate4)
  doc.text(`Generated: ${today}`, ML, y)
  y += 9

  // ── revenue ───────────────────────────────────────────────────────────────
  y = maybeNewPage(doc, y, 20)
  y = sectionTitle(doc, 'Revenue', y)
  y = row(doc, `Paid invoices (${d.revenue.invoiceCount} invoice${d.revenue.invoiceCount !== 1 ? 's' : ''})`,
    fmt(d.revenue.totalPaid), y, { color: C.teal })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...C.slate4)
  doc.text('Subtotal from invoices marked paid. HST is excluded.', ML, y)
  y += 8

  // ── expenses ──────────────────────────────────────────────────────────────
  y = maybeNewPage(doc, y, 40)
  y = sectionTitle(doc, 'Business Expenses', y)
  const cats = Object.entries(d.expenses.byCategory)
  if (cats.length > 0) {
    const tableBody = cats.map(([cat, v]) => [CAT_LABELS[cat] ?? cat, fmt(v.amount)])
    tableBody.push(['Total', fmt(d.expenses.total)])
    autoTable(doc, {
      startY: y,
      head: [['Category', 'Amount']],
      body: tableBody,
      margin: { left: ML, right: 20 },
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: { top: 2, bottom: 2, left: 0, right: 0 },
        textColor: C.slate6,
      },
      headStyles: {
        fontStyle: 'bold',
        fontSize: 8,
        textColor: C.slate5,
        fillColor: [255, 255, 255],
      },
      columnStyles: {
        0: { cellWidth: 110 },
        1: { halign: 'right', cellWidth: 50 },
      },
      didParseCell: (h) => {
        if (h.row.index === tableBody.length - 1) {
          h.cell.styles.fontStyle = 'bold'
          h.cell.styles.textColor = C.slate8
        }
      },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5
  } else {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.slate4)
    doc.text('No expenses recorded this year.', ML, y); y += 8
  }

  // ── mileage ───────────────────────────────────────────────────────────────
  y = maybeNewPage(doc, y, 28)
  y = sectionTitle(doc, 'Mileage Deduction', y)
  if (d.mileage.km > 0) {
    y = row(doc, `Total km driven (${d.mileage.tripCount} trip${d.mileage.tripCount !== 1 ? 's' : ''})`,
      `${d.mileage.km.toFixed(1)} km`, y)
    y = row(doc, 'CRA rate (2025, first 5,000 km)', '$0.72/km', y)
    y = row(doc, 'Est. mileage deduction', fmt(d.mileage.deduction), y, { bold: true, color: C.amber })
  } else {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.slate4)
    doc.text('No trips logged this year.', ML, y); y += 5
  }
  y += 4

  // ── net income summary ────────────────────────────────────────────────────
  y = maybeNewPage(doc, y, 40)
  y = sectionTitle(doc, 'Net Income Summary', y)
  y = row(doc, 'Revenue (excl. HST)', fmt(d.revenue.totalPaid), y)
  y = row(doc, 'Business expenses', `-${fmt(d.expenses.total)}`, y, { color: C.slate5 })
  y = row(doc, 'Mileage deduction', `-${fmt(d.mileage.deduction)}`, y, { color: C.slate5 })

  doc.setDrawColor(...C.slate2); doc.setLineWidth(0.2); doc.line(ML, y, MR, y); y += 4

  y = row(doc, 'Estimated net income', fmt(d.netProfit), y,
    { bold: true, color: d.netProfit >= 0 ? C.teal : C.red })
  y += 8

  // ── footer + disclaimer ────────────────────────────────────────────────────
  y = maybeNewPage(doc, y, 22)
  doc.setDrawColor(...C.slate2); doc.setLineWidth(0.3); doc.line(ML, y, MR, y)
  y += 5

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...C.slate4)
  doc.text(`Generated by SparkClean  ${today}`, ML, y)
  y += 5

  const disclaimer = 'This summary includes only income and expenses tracked in SparkClean. SparkClean does not provide tax or financial advice. Please consult a qualified accountant or tax professional for guidance on your specific situation.'
  const lines = doc.splitTextToSize(disclaimer, CW) as string[]
  doc.text(lines, ML, y)

  // ── save ─────────────────────────────────────────────────────────────────
  doc.save(`SparkClean_Tax_Summary_${d.year}_${d.business.name.replace(/\s+/g, '_')}.pdf`)
}
