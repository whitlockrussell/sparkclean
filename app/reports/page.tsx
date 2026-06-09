'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { PageContainer } from '@/components/layout/PageContainer'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { createClient } from '@/lib/supabase/client'
import { DollarSign, TrendingUp, Receipt, BarChart2, Car, Download, Lock } from 'lucide-react'
import { CRA_RATE_TIER1, CRA_RATE_TIER2, CRA_KM_THRESHOLD } from '@/lib/hooks/useMileage'
import type { MileageLog } from '@/lib/types'
import type { Business } from '@/lib/hooks/useBusiness'
import { usePlan } from '@/lib/hooks/usePlan'
import Link from 'next/link'

// ── types ─────────────────────────────────────────────────────────────────────

type QuarterData = {
  income: number
  totalInvoiced: number
  expenses: number
  hstCollected: number
  hstPaid: number
  invoiceCount: number
  expenseCount: number
  expensesByCategory: Record<string, { amount: number; hstPaid: number }>
  quarterKm: number
  quarterMileageDeduction: number
  mileageLogs: MileageLog[]
}

type AnnualData = {
  year: number
  income: number
  totalInvoiced: number
  expenses: number
  hstCollected: number
  hstPaid: number
  invoiceCount: number
  expenseCount: number
  expensesByCategory: Record<string, { amount: number; hstPaid: number }>
  totalKm: number
  mileageDeduction: number
  tripCount: number
  quarterBreakdown: {
    q: number
    income: number
    expenses: number
    hstCollected: number
    hstPaid: number
  }[]
}

// ── helpers ───────────────────────────────────────────────────────────────────

function getQuarterRange(quarter: string) {
  const [year, q] = quarter.split('-Q').map(Number)
  const startMonth = (q - 1) * 3
  const endMonth = startMonth + 2
  const start = new Date(year, startMonth, 1).toISOString().split('T')[0]
  const end   = new Date(year, endMonth + 1, 0).toISOString().split('T')[0]
  return { start, end }
}

function getCurrentQuarter() {
  const now = new Date()
  return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`
}

function formatQuarter(quarter: string) {
  const [year, q] = quarter.split('-Q')
  const labels = ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec']
  return `Q${q} ${year} · ${labels[parseInt(q) - 1]}`
}

function buildExpensesByCategory(
  expenses: { amount: number; hst_paid: number; category: string }[],
): Record<string, { amount: number; hstPaid: number }> {
  return expenses.reduce((acc, e) => {
    if (!acc[e.category]) acc[e.category] = { amount: 0, hstPaid: 0 }
    acc[e.category].amount  += e.amount
    acc[e.category].hstPaid += e.hst_paid
    return acc
  }, {} as Record<string, { amount: number; hstPaid: number }>)
}

function calcMileageDeduction(logs: MileageLog[], priorKm = 0): number {
  const sorted = [...logs].sort((a, b) => a.trip_date.localeCompare(b.trip_date))
  let km = priorKm
  let deduction = 0
  for (const l of sorted) {
    const tier1 = Math.min(l.km, Math.max(0, CRA_KM_THRESHOLD - km))
    const tier2  = l.km - tier1
    deduction += tier1 * CRA_RATE_TIER1 + tier2 * CRA_RATE_TIER2
    km += l.km
  }
  return deduction
}

const CAT_LABELS: Record<string, string> = {
  supplies:  'Supplies',
  gas:       'Gas & Fuel',
  equipment: 'Equipment',
  insurance: 'Insurance',
  phone:     'Phone & Internet',
  other:     'Other',
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const supabase = createClient()

  const { isPro } = usePlan()
  const [mode, setMode]             = useState<'quarterly' | 'annual' | 'tax-summary'>('quarterly')
  const [quarter, setQuarter]       = useState(getCurrentQuarter())
  const [annualYear, setAnnualYear] = useState(new Date().getFullYear())
  const [data, setData]             = useState<QuarterData | null>(null)
  const [annualData, setAnnualData] = useState<AnnualData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [business, setBusiness]     = useState<Business | null>(null)
  const [exporting, setExporting]   = useState(false)
  const [exportingTax, setExportingTax] = useState(false)

  // ── quarter selectors ──────────────────────────────────────────────────────
  const now = new Date()
  const uniqueQuarters = [...new Set(
    Array.from({ length: 4 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1)
      return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`
    })
  )].reverse()
  const availableYears = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()]

  // ── quarterly data load ────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'quarterly') return
    async function load() {
      setLoading(true)
      const { start, end } = getQuarterRange(quarter)
      const [year] = quarter.split('-Q').map(Number)
      const yearStart = `${year}-01-01`

      const [invRes, expRes, mileYtdRes, mileQRes, bizRes] = await Promise.all([
        supabase.from('invoices').select('subtotal, hst_amount, total, status')
          .in('status', ['paid', 'sent', 'overdue']).gte('issue_date', start).lte('issue_date', end),
        supabase.from('expenses').select('amount, hst_paid, category')
          .gte('expense_date', start).lte('expense_date', end),
        supabase.from('mileage_logs').select('*').gte('trip_date', yearStart).lt('trip_date', start),
        supabase.from('mileage_logs').select('*').gte('trip_date', start).lte('trip_date', end),
        supabase.from('businesses').select('*').single(),
      ])

      const invoices  = invRes.data ?? []
      const expenses  = (expRes.data ?? []) as { amount: number; hst_paid: number; category: string }[]
      const ytdLogs   = (mileYtdRes.data ?? []) as MileageLog[]
      const qLogs     = (mileQRes.data  ?? []) as MileageLog[]
      if (bizRes.data) setBusiness(bizRes.data as Business)

      const paidInvoices = invoices.filter(i => i.status === 'paid')
      const ytdKm = ytdLogs.reduce((s, l) => s + l.km, 0)

      setData({
        income:           paidInvoices.reduce((s, i) => s + i.subtotal, 0),
        totalInvoiced:    invoices.reduce((s, i) => s + i.subtotal, 0),
        expenses:         expenses.reduce((s, e) => s + e.amount, 0),
        hstCollected:     paidInvoices.reduce((s, i) => s + i.hst_amount, 0),
        hstPaid:          expenses.reduce((s, e) => s + e.hst_paid, 0),
        invoiceCount:     invoices.length,
        expenseCount:     expenses.length,
        expensesByCategory: buildExpensesByCategory(expenses),
        quarterKm:        qLogs.reduce((s, l) => s + l.km, 0),
        quarterMileageDeduction: calcMileageDeduction(qLogs, ytdKm),
        mileageLogs:      qLogs,
      })
      setLoading(false)
    }
    load()
  }, [quarter, mode])

  // ── annual + tax-summary data load ─────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'annual' && mode !== 'tax-summary') return
    async function load() {
      setLoading(true)
      const yearStart = `${annualYear}-01-01`
      const yearEnd   = `${annualYear}-12-31`

      const [invRes, expRes, mileRes, bizRes] = await Promise.all([
        supabase.from('invoices').select('subtotal, hst_amount, status, issue_date')
          .in('status', ['paid', 'sent', 'overdue']).gte('issue_date', yearStart).lte('issue_date', yearEnd),
        supabase.from('expenses').select('amount, hst_paid, category, expense_date')
          .gte('expense_date', yearStart).lte('expense_date', yearEnd),
        supabase.from('mileage_logs').select('*').gte('trip_date', yearStart).lte('trip_date', yearEnd),
        supabase.from('businesses').select('*').single(),
      ])

      const invoices  = (invRes.data ?? []) as { subtotal: number; hst_amount: number; status: string; issue_date: string }[]
      const expenses  = (expRes.data ?? []) as { amount: number; hst_paid: number; category: string; expense_date: string }[]
      const mileage   = (mileRes.data ?? []) as MileageLog[]
      if (bizRes.data) setBusiness(bizRes.data as Business)

      const paidInvoices = invoices.filter(i => i.status === 'paid')

      // Per-quarter grouping for the breakdown table
      const quarterBreakdown = [1, 2, 3, 4].map(q => {
        const qInv = paidInvoices.filter(i => Math.ceil(parseInt(i.issue_date.split('-')[1]) / 3) === q)
        const qExp = expenses.filter(e => Math.ceil(parseInt(e.expense_date.split('-')[1]) / 3) === q)
        return {
          q,
          income:       qInv.reduce((s, i) => s + i.subtotal, 0),
          expenses:     qExp.reduce((s, e) => s + e.amount, 0),
          hstCollected: qInv.reduce((s, i) => s + i.hst_amount, 0),
          hstPaid:      qExp.reduce((s, e) => s + e.hst_paid, 0),
        }
      })

      setAnnualData({
        year:         annualYear,
        income:       paidInvoices.reduce((s, i) => s + i.subtotal, 0),
        totalInvoiced: invoices.reduce((s, i) => s + i.subtotal, 0),
        expenses:     expenses.reduce((s, e) => s + e.amount, 0),
        hstCollected: paidInvoices.reduce((s, i) => s + i.hst_amount, 0),
        hstPaid:      expenses.reduce((s, e) => s + e.hst_paid, 0),
        invoiceCount: invoices.length,
        expenseCount: expenses.length,
        expensesByCategory: buildExpensesByCategory(expenses),
        totalKm:      mileage.reduce((s, l) => s + l.km, 0),
        mileageDeduction: calcMileageDeduction(mileage),
        tripCount:    mileage.length,
        quarterBreakdown,
      })
      setLoading(false)
    }
    load()
  }, [annualYear, mode])

  // ── derived values ─────────────────────────────────────────────────────────
  const d       = mode === 'quarterly'   ? data       : null
  const ad      = mode !== 'quarterly'   ? annualData : null
  const netHST  = d  ? d.hstCollected  - d.hstPaid  : ad ? ad.hstCollected - ad.hstPaid : 0
  const profit  = d  ? d.income - d.expenses - netHST
                     : ad ? ad.income - ad.expenses - netHST : 0

  // ── HST report export (unchanged) ─────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true)
    try {
      const biz = {
        name:      business?.business_name ?? 'My Business',
        hstNumber: business?.hst_number    ?? null,
        city:      business?.city          ?? null,
        province:  business?.province      ?? null,
        email:     business?.email         ?? null,
        phone:     business?.phone         ?? null,
        logoUrl:   business?.logo_url      ?? null,
      }
      if (mode === 'quarterly' && d) {
        const { generateReport } = await import('@/lib/pdf/generateReport')
        await generateReport({
          quarter,
          business: biz,
          revenue: {
            totalInvoiced: d.totalInvoiced,
            totalPaid:     d.income,
            outstanding:   d.totalInvoiced - d.income,
            hstCollected:  d.hstCollected,
            invoiceCount:  d.invoiceCount,
          },
          expenses: { total: d.expenses, hstPaid: d.hstPaid, byCategory: d.expensesByCategory },
          mileage:  { km: d.quarterKm, deduction: d.quarterMileageDeduction, tripCount: d.mileageLogs.length },
          netHST, profit,
        })
      } else if (mode === 'annual' && ad) {
        const { generateAnnualReport } = await import('@/lib/pdf/generateReport')
        await generateAnnualReport({
          year: ad.year,
          business: biz,
          revenue: {
            totalInvoiced: ad.totalInvoiced,
            totalPaid:     ad.income,
            outstanding:   ad.totalInvoiced - ad.income,
            hstCollected:  ad.hstCollected,
            invoiceCount:  ad.invoiceCount,
          },
          expenses: { total: ad.expenses, hstPaid: ad.hstPaid, byCategory: ad.expensesByCategory },
          mileage:  { km: ad.totalKm, deduction: ad.mileageDeduction, tripCount: ad.tripCount },
          quarters: ad.quarterBreakdown,
          netHST, profit,
        })
      }
    } finally {
      setExporting(false)
    }
  }

  // ── tax summary export ─────────────────────────────────────────────────────
  const handleTaxExport = async () => {
    if (!ad) return
    setExportingTax(true)
    try {
      const { generateTaxSummaryPDF } = await import('@/lib/pdf/generateTaxSummaryPDF')
      await generateTaxSummaryPDF({
        year: annualYear,
        business: {
          name:      business?.business_name ?? 'My Business',
          hstNumber: business?.hst_number    ?? null,
          city:      business?.city          ?? null,
          province:  business?.province      ?? null,
          email:     business?.email         ?? null,
          phone:     business?.phone         ?? null,
          logoUrl:   business?.logo_url      ?? null,
        },
        revenue: {
          totalPaid:    ad.income,
          invoiceCount: ad.invoiceCount,
        },
        expenses: {
          total:      ad.expenses,
          byCategory: ad.expensesByCategory,
        },
        mileage: {
          km:        ad.totalKm,
          deduction: ad.mileageDeduction,
          tripCount: ad.tripCount,
        },
        netProfit: ad.income - ad.expenses - ad.mileageDeduction,
      })
    } finally {
      setExportingTax(false)
    }
  }

  const canExport = !loading && (mode === 'quarterly' ? !!d : !!ad)
  const subtitle  = mode === 'quarterly' ? formatQuarter(quarter)
                  : mode === 'annual'    ? String(annualYear)
                  : `Tax Summary ${annualYear}`

  // ── shared button style ────────────────────────────────────────────────────
  const exportBtnClass = 'flex items-center gap-1.5 text-xs font-semibold text-teal-600 border border-teal-200 bg-teal-50 hover:bg-teal-100 disabled:opacity-50 rounded-xl px-3 py-1.5 transition-colors'
  const lockBtnClass   = 'flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl px-3 py-1.5 transition-colors'

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      <TopHeader
        title="Reports"
        subtitle={subtitle}
        action={
          <>
            {/* HST Report PDF — quarterly and annual modes only */}
            {canExport && mode !== 'tax-summary' && (isPro ? (
              <button onClick={handleExport} disabled={exporting} className={exportBtnClass}>
                <Download className="w-3.5 h-3.5" />
                {exporting ? 'Generating…' : 'HST Report PDF'}
              </button>
            ) : (
              <Link href="/upgrade" className={lockBtnClass}>
                <Lock className="w-3.5 h-3.5" />
                HST Report PDF
              </Link>
            ))}

            {/* Tax Summary PDF — tax-summary mode only */}
            {canExport && mode === 'tax-summary' && (isPro ? (
              <button onClick={handleTaxExport} disabled={exportingTax} className={exportBtnClass}>
                <Download className="w-3.5 h-3.5" />
                {exportingTax ? 'Generating…' : `Tax Summary ${annualYear}`}
              </button>
            ) : (
              <Link href="/upgrade" className={lockBtnClass}>
                <Lock className="w-3.5 h-3.5" />
                Tax Summary {annualYear}
              </Link>
            ))}
          </>
        }
      />
      <PageContainer>

        {/* Contextual description */}
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
          {mode === 'tax-summary'
            ? 'Share this with your accountant at tax time.'
            : 'Use this to calculate and remit HST to CRA. Most businesses remit quarterly.'}
        </p>

        {/* Mode toggle — three tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
          {(['quarterly', 'annual', 'tax-summary'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}>
              {m === 'quarterly' ? '⊞ Quarterly HST' : m === 'annual' ? '📅 Annual HST' : '📋 Annual Tax Summary'}
            </button>
          ))}
        </div>

        {/* Quarter / Year selector */}
        {mode === 'quarterly' ? (
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5 overflow-x-auto">
            {uniqueQuarters.map(q => (
              <button key={q} onClick={() => setQuarter(q)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  quarter === q ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}>
                {q.replace('-', ' ')}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
            {availableYears.map(y => (
              <button key={y} onClick={() => setAnnualYear(y)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  annualYear === y ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}>
                {y}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <PageSkeleton />
        ) : mode === 'quarterly' && d ? (
          <QuarterlyView data={d} netHST={netHST} profit={profit} />
        ) : mode === 'annual' && ad ? (
          <AnnualView data={ad} netHST={netHST} profit={profit} />
        ) : mode === 'tax-summary' && ad ? (
          <TaxSummaryView data={ad} />
        ) : null}

      </PageContainer>
    </AppShell>
  )
}

// ── quarterly view (unchanged) ────────────────────────────────────────────────

function QuarterlyView({ data, netHST, profit }: { data: QuarterData; netHST: number; profit: number }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard label="Income"      value={`$${data.income.toFixed(0)}`}   icon={TrendingUp} accent="teal"
          sub={`${data.invoiceCount} paid invoice${data.invoiceCount !== 1 ? 's' : ''}`} />
        <StatCard label="Expenses"    value={`$${data.expenses.toFixed(0)}`} icon={Receipt}    accent="amber"
          sub={`${data.expenseCount} expense${data.expenseCount !== 1 ? 's' : ''}`} />
        <StatCard label="HST to remit" value={`$${netHST.toFixed(2)}`}       icon={DollarSign} accent={netHST > 0 ? 'red' : 'slate'}
          sub="For this quarter" />
        <StatCard label="Est. profit"  value={`$${profit.toFixed(0)}`}        icon={BarChart2}  accent="slate"
          sub="After HST remittance" />
      </div>

      <SectionLabel>HST summary</SectionLabel>
      <Card className="p-4 space-y-3 mb-5">
        {[
          { label: 'HST collected on invoices', value: `+$${data.hstCollected.toFixed(2)}`, color: 'text-teal-600' },
          { label: 'HST paid on expenses (ITC)', value: `−$${data.hstPaid.toFixed(2)}`, color: 'text-slate-500 dark:text-slate-400' },
          { label: 'Net HST to remit to CRA', value: `$${netHST.toFixed(2)}`,
            color: netHST > 0 ? 'text-red-500 font-semibold' : 'text-green-600 font-semibold' },
        ].map(r => <DataRow key={r.label} label={r.label} value={r.value} valueClass={r.color} />)}
        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            File your HST return with the CRA quarterly. Keep all receipts for 6 years.
            {netHST <= 0 && ' You have more input tax credits than HST collected this quarter.'}
          </p>
        </div>
      </Card>

      <SectionLabel>Income breakdown</SectionLabel>
      <Card className="p-4 space-y-3 mb-5">
        {[
          { label: 'Gross revenue (excl. HST)', value: `$${data.income.toFixed(2)}`,    color: 'text-slate-700 dark:text-slate-200' },
          { label: 'Business expenses',          value: `−$${data.expenses.toFixed(2)}`, color: 'text-slate-500 dark:text-slate-400' },
          { label: 'HST remittance',             value: `−$${netHST.toFixed(2)}`,        color: 'text-slate-500 dark:text-slate-400' },
          { label: 'Estimated net profit',       value: `$${profit.toFixed(2)}`,
            color: profit >= 0 ? 'text-teal-600 font-semibold' : 'text-red-500 font-semibold' },
        ].map(r => <DataRow key={r.label} label={r.label} value={r.value} valueClass={r.color} />)}
      </Card>

      <SectionLabel>Mileage</SectionLabel>
      <MileageCard km={data.quarterKm} deduction={data.quarterMileageDeduction} trips={data.mileageLogs.length} />
    </>
  )
}

// ── annual view (unchanged) ───────────────────────────────────────────────────

function AnnualView({ data, netHST, profit }: { data: AnnualData; netHST: number; profit: number }) {
  const Q_LABELS = ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec']
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard label="Annual income"   value={`$${data.income.toFixed(0)}`}   icon={TrendingUp} accent="teal"
          sub={`${data.invoiceCount} paid invoice${data.invoiceCount !== 1 ? 's' : ''}`} />
        <StatCard label="Annual expenses" value={`$${data.expenses.toFixed(0)}`} icon={Receipt}    accent="amber"
          sub={`${data.expenseCount} expense${data.expenseCount !== 1 ? 's' : ''}`} />
        <StatCard label="HST to remit"    value={`$${netHST.toFixed(2)}`}        icon={DollarSign} accent={netHST > 0 ? 'red' : 'slate'}
          sub="For the year" />
        <StatCard label="Est. net income" value={`$${profit.toFixed(0)}`}         icon={BarChart2}  accent="slate"
          sub="After HST remittance" />
      </div>

      {/* Quarterly breakdown */}
      <SectionLabel>Quarterly breakdown</SectionLabel>
      <Card className="p-4 mb-5 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 dark:text-slate-500 font-semibold">
              <th className="text-left pb-2 font-semibold"></th>
              {data.quarterBreakdown.map(q => (
                <th key={q.q} className="text-right pb-2 font-semibold">
                  Q{q.q}<br /><span className="font-normal text-[10px]">{Q_LABELS[q.q - 1]}</span>
                </th>
              ))}
              <th className="text-right pb-2 font-semibold">Year</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              { label: 'Revenue',       key: 'income'       as const, color: 'text-teal-600' },
              { label: 'HST collected', key: 'hstCollected' as const, color: 'text-slate-700 dark:text-slate-200' },
              { label: 'ITC',           key: 'hstPaid'      as const, color: 'text-slate-700 dark:text-slate-200' },
              { label: 'Net HST',       key: null,                    color: 'text-red-500' },
            ].map(row => (
              <tr key={row.label}>
                <td className="py-2 text-slate-500 dark:text-slate-400">{row.label}</td>
                {data.quarterBreakdown.map(q => {
                  const val = row.key ? q[row.key] : q.hstCollected - q.hstPaid
                  return (
                    <td key={q.q} className={`py-2 text-right ${row.color}`}>
                      ${val.toFixed(2)}
                    </td>
                  )
                })}
                <td className={`py-2 text-right font-semibold ${row.color}`}>
                  ${row.key
                    ? data[row.key === 'income' ? 'income' : row.key === 'hstCollected' ? 'hstCollected' : 'hstPaid'].toFixed(2)
                    : netHST.toFixed(2)
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <SectionLabel>Annual HST summary</SectionLabel>
      <Card className="p-4 space-y-3 mb-5">
        {[
          { label: 'HST collected on invoices', value: `+$${data.hstCollected.toFixed(2)}`, color: 'text-teal-600' },
          { label: 'HST paid on expenses (ITC)', value: `−$${data.hstPaid.toFixed(2)}`, color: 'text-slate-500 dark:text-slate-400' },
          { label: 'Net HST to remit to CRA', value: `$${netHST.toFixed(2)}`,
            color: netHST > 0 ? 'text-red-500 font-semibold' : 'text-green-600 font-semibold' },
        ].map(r => <DataRow key={r.label} label={r.label} value={r.value} valueClass={r.color} />)}
        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            File your HST return with the CRA quarterly. Keep all receipts for 6 years.
          </p>
        </div>
      </Card>

      <SectionLabel>Annual income summary</SectionLabel>
      <Card className="p-4 space-y-3 mb-5">
        {[
          { label: 'Gross revenue (excl. HST)', value: `$${data.income.toFixed(2)}`,    color: 'text-slate-700 dark:text-slate-200' },
          { label: 'Business expenses',          value: `−$${data.expenses.toFixed(2)}`, color: 'text-slate-500 dark:text-slate-400' },
          { label: 'HST remittance',             value: `−$${netHST.toFixed(2)}`,        color: 'text-slate-500 dark:text-slate-400' },
          { label: 'Estimated net income',       value: `$${profit.toFixed(2)}`,
            color: profit >= 0 ? 'text-teal-600 font-semibold' : 'text-red-500 font-semibold' },
        ].map(r => <DataRow key={r.label} label={r.label} value={r.value} valueClass={r.color} />)}
      </Card>

      <SectionLabel>Annual mileage</SectionLabel>
      <MileageCard km={data.totalKm} deduction={data.mileageDeduction} trips={data.tripCount} annual />
    </>
  )
}

// ── tax summary view (new) ────────────────────────────────────────────────────

function TaxSummaryView({ data }: { data: AnnualData }) {
  const netProfit = data.income - data.expenses - data.mileageDeduction
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard label="Revenue"   value={`$${data.income.toFixed(0)}`}            icon={TrendingUp} accent="teal"
          sub={`${data.invoiceCount} paid invoice${data.invoiceCount !== 1 ? 's' : ''}`} />
        <StatCard label="Expenses"  value={`$${data.expenses.toFixed(0)}`}           icon={Receipt}    accent="amber"
          sub={`${data.expenseCount} expense${data.expenseCount !== 1 ? 's' : ''}`} />
        <StatCard label="Mileage"   value={`$${data.mileageDeduction.toFixed(0)}`}   icon={Car}        accent="slate"
          sub={`${data.totalKm.toFixed(1)} km · ${data.tripCount} trip${data.tripCount !== 1 ? 's' : ''}`} />
        <StatCard label="Net Income" value={`$${netProfit.toFixed(0)}`}              icon={BarChart2}  accent={netProfit >= 0 ? 'teal' : 'red'}
          sub="After exp & mileage" />
      </div>

      <SectionLabel>Revenue</SectionLabel>
      <Card className="p-4 space-y-3 mb-5">
        <DataRow
          label={`Paid invoices (${data.invoiceCount})`}
          value={`$${data.income.toFixed(2)}`}
          valueClass="text-teal-600 font-semibold"
        />
        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            Subtotal from invoices marked paid. HST is excluded and tracked separately in the HST Report.
          </p>
        </div>
      </Card>

      <SectionLabel>Business expenses by category</SectionLabel>
      <Card className="p-4 space-y-3 mb-5">
        {Object.keys(data.expensesByCategory).length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No expenses recorded this year.</p>
        ) : (
          <>
            {Object.entries(data.expensesByCategory).map(([cat, v]) => (
              <DataRow
                key={cat}
                label={CAT_LABELS[cat] ?? cat}
                value={`$${v.amount.toFixed(2)}`}
                valueClass="text-slate-700 dark:text-slate-200"
              />
            ))}
            <div className="border-t border-slate-100 pt-3">
              <DataRow
                label="Total expenses"
                value={`$${data.expenses.toFixed(2)}`}
                valueClass="text-amber-600 font-semibold"
              />
            </div>
          </>
        )}
      </Card>

      <SectionLabel>Mileage deduction</SectionLabel>
      <MileageCard km={data.totalKm} deduction={data.mileageDeduction} trips={data.tripCount} annual />

      <SectionLabel>Net income</SectionLabel>
      <Card className="p-4 space-y-3 mb-5">
        {[
          { label: 'Revenue (excl. HST)',    value: `$${data.income.toFixed(2)}`,             color: 'text-teal-600' },
          { label: 'Business expenses',      value: `−$${data.expenses.toFixed(2)}`,          color: 'text-slate-500 dark:text-slate-400' },
          { label: 'Mileage deduction',      value: `−$${data.mileageDeduction.toFixed(2)}`,  color: 'text-slate-500 dark:text-slate-400' },
          { label: 'Estimated net income',   value: `$${netProfit.toFixed(2)}`,
            color: netProfit >= 0 ? 'text-teal-600 font-semibold' : 'text-red-500 font-semibold' },
        ].map(r => <DataRow key={r.label} label={r.label} value={r.value} valueClass={r.color} />)}
      </Card>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-300 leading-relaxed mb-5">
        SparkClean is designed with sole proprietors in mind. Your situation may differ — consult a tax professional to confirm what reports and deductions apply to you.
      </div>
    </>
  )
}

// ── shared small components ───────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 mt-5 first:mt-0">{children}</h2>
  )
}

function DataRow({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  )
}

function MileageCard({ km, deduction, trips, annual }: { km: number; deduction: number; trips: number; annual?: boolean }) {
  return (
    <Card className="p-4 mb-5">
      {km === 0 ? (
        <div className="flex items-center gap-3 py-1">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Car className="w-4 h-4 text-slate-400 dark:text-slate-500" strokeWidth={1.8} />
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            No trips logged{annual ? ' this year' : ' this quarter'}. <a href="/mileage" className="text-teal-600 underline">Start tracking</a>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {[
            { label: 'Total km driven', value: `${km.toFixed(1)} km`,         color: 'text-slate-700 dark:text-slate-200' },
            { label: 'Trips logged',    value: `${trips}`,                     color: 'text-slate-700 dark:text-slate-200' },
            { label: 'Est. deduction',  value: `$${deduction.toFixed(2)}`,     color: 'text-amber-600 font-semibold' },
          ].map(r => <DataRow key={r.label} label={r.label} value={r.value} valueClass={r.color} />)}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
              CRA 2025 rate: $0.72/km (first {CRA_KM_THRESHOLD.toLocaleString()} km) · $0.66/km after.
              {!annual && ' Deduction accounts for km driven earlier in the year.'}
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}
