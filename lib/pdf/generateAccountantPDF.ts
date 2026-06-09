import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

type RGB = [number, number, number]

const C: Record<string, RGB> = {
  slate8: [30, 41, 59],
  slate6: [71, 85, 105],
  slate5: [100, 116, 139],
  slate2: [226, 232, 240],
  green:  [21, 128, 61],
  amber:  [161, 98, 7],
}

const ML = 20
const MR = 190
const CW = 170

type InvoiceItem = {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

type FullInvoice = {
  invoice_number: string
  issue_date: string
  due_date: string | null
  paid_at: string | null
  status: string
  subtotal: number
  hst_amount: number
  total: number
  notes: string | null
  payment_method: string | null
  items: InvoiceItem[]
  clients: {
    first_name: string
    last_name: string
    address: string | null
    city: string | null
    province: string
    postal_code: string | null
    email: string | null
    phone: string | null
  } | null
}

export type AccountantPDFOptions = {
  quarter?: string   // omit for an all-time export
  business: {
    name: string
    hstNumber: string | null
    address: string | null
    city: string | null
    province: string | null
    phone: string | null
    email: string | null
  }
  invoices: FullInvoice[]
}

function fmtDate(date: string | null): string {
  if (!date) return ''
  const d = new Date(date.split('T')[0] + 'T12:00:00')
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

type DocWithPlugin = jsPDF & { lastAutoTable: { finalY: number } }

export async function generateAccountantPDF({ quarter, business, invoices }: AccountantPDFOptions): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as DocWithPlugin

  let headerLabel: string
  let saveFilename: string
  if (quarter) {
    const [year, q] = quarter.split('-Q')
    const qLabels = ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec']
    headerLabel = `Q${q} ${year} · ${qLabels[parseInt(q) - 1]}`
    saveFilename = `invoices-Q${q}-${year}.pdf`
  } else {
    headerLabel = 'All Invoices'
    saveFilename = 'invoices-all.pdf'
  }
  const quarterLabel = headerLabel

  invoices.forEach((inv, index) => {
    if (index > 0) doc.addPage()
    let y = 20

    // Business name
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...C.slate8)
    doc.text(business.name, ML, y)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.slate5)
    doc.text(quarterLabel, MR, y, { align: 'right' })
    y += 5

    // Business contact details
    doc.setFontSize(8)
    doc.setTextColor(...C.slate6)
    const bizLines: string[] = []
    if (business.address) bizLines.push(business.address)
    if (business.city) bizLines.push(`${business.city}, ${business.province}`)
    if (business.phone) bizLines.push(business.phone)
    if (business.email) bizLines.push(business.email)
    if (business.hstNumber) bizLines.push(`HST# ${business.hstNumber}`)
    for (const line of bizLines) { doc.text(line, ML, y); y += 4 }

    y += 4
    doc.setDrawColor(...C.slate2)
    doc.setLineWidth(0.3)
    doc.line(ML, y, MR, y)
    y += 8

    // Invoice number + status
    const isPaid = inv.status === 'paid'
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...C.slate8)
    doc.text(inv.invoice_number, ML, y)

    doc.setFontSize(8)
    doc.setTextColor(...(isPaid ? C.green : C.amber))
    doc.text(inv.status.toUpperCase(), MR, y, { align: 'right' })
    y += 6

    // Dates
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.slate6)
    const dateParts = [`Issued: ${fmtDate(inv.issue_date)}`]
    if (inv.due_date) dateParts.push(`Due: ${fmtDate(inv.due_date)}`)
    if (inv.paid_at) dateParts.push(`Paid: ${fmtDate(inv.paid_at)}`)
    doc.text(dateParts.join('   ·   '), ML, y)
    y += 8

    // Bill to
    if (inv.clients) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...C.slate5)
      doc.text('BILL TO', ML, y)
      y += 4

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...C.slate8)
      doc.text(`${inv.clients.first_name} ${inv.clients.last_name}`, ML, y)
      y += 4.5

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...C.slate6)
      if (inv.clients.address) { doc.text(inv.clients.address, ML, y); y += 4 }
      if (inv.clients.city) {
        doc.text(`${inv.clients.city}, ${inv.clients.province} ${inv.clients.postal_code ?? ''}`.trim(), ML, y)
        y += 4
      }
    }

    y += 4

    // Line items
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: 20 },
      head: [['Description', 'Qty', 'Unit price', 'Amount']],
      body: inv.items.map(item => [
        item.description,
        String(item.quantity),
        `$${item.unit_price.toFixed(2)}`,
        `$${item.amount.toFixed(2)}`,
      ]),
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: C.slate5,
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2.5,
      },
      bodyStyles: {
        textColor: C.slate6,
        fontSize: 8.5,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 14, halign: 'center' },
        2: { cellWidth: 26, halign: 'right' },
        3: { cellWidth: 26, halign: 'right' },
      },
      theme: 'plain',
      tableLineColor: C.slate2,
      tableLineWidth: 0.2,
    })

    y = doc.lastAutoTable.finalY + 6

    // Totals block
    const totalsX = 130
    const addTotalRow = (label: string, value: string, color: RGB, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      doc.setFontSize(bold ? 9.5 : 8.5)
      doc.setTextColor(...color)
      doc.text(label, totalsX, y)
      doc.text(value, MR, y, { align: 'right' })
      y += 5
    }

    addTotalRow('Subtotal', `$${inv.subtotal.toFixed(2)}`, C.slate6)
    addTotalRow('HST (13%)', `$${inv.hst_amount.toFixed(2)}`, C.slate6)

    doc.setDrawColor(...C.slate2)
    doc.line(totalsX, y - 1, MR, y - 1)
    y += 2

    addTotalRow('Total', `$${inv.total.toFixed(2)}`, C.slate8, true)

    if (isPaid) {
      addTotalRow('Amount paid', `$${inv.total.toFixed(2)}`, C.green)
      if (inv.payment_method) {
        const methodLabel = inv.payment_method === 'e_transfer' ? 'E-transfer'
          : inv.payment_method.charAt(0).toUpperCase() + inv.payment_method.slice(1)
        addTotalRow('Payment method', methodLabel, C.slate5)
      }
    }

    // Notes
    if (inv.notes) {
      y += 4
      doc.setDrawColor(...C.slate2)
      doc.line(ML, y, MR, y)
      y += 6

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...C.slate5)
      doc.text('NOTES', ML, y)
      y += 4

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...C.slate6)
      const lines = doc.splitTextToSize(inv.notes, CW)
      doc.text(lines, ML, y)
    }
  })

  doc.save(saveFilename)
}
