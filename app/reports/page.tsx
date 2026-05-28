'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { PageContainer } from '@/components/layout/PageContainer'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { createClient } from '@/lib/supabase/client'
import { DollarSign, TrendingUp, Receipt, BarChart2 } from 'lucide-react'

type QuarterData = {
  income: number
  expenses: number
  hstCollected: number
  hstPaid: number
  invoiceCount: number
  expenseCount: number
}

function getQuarterRange(quarter: string) {
  const [year, q] = quarter.split('-Q').map(Number)
  const startMonth = (q - 1) * 3
  const endMonth = startMonth + 2
  const start = new Date(year, startMonth, 1).toISOString().split('T')[0]
  const end = new Date(year, endMonth + 1, 0).toISOString().split('T')[0]
  return { start, end }
}

function getCurrentQuarter() {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3) + 1
  return `${now.getFullYear()}-Q${q}`
}

function formatQuarter(quarter: string) {
  const [year, q] = quarter.split('-Q')
  const labels = ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec']
  return `Q${q.replace('Q', '')} ${year} · ${labels[parseInt(q) - 1]}`
}

export default function ReportsPage() {
  const [quarter, setQuarter] = useState(getCurrentQuarter())
  const [data, setData] = useState<QuarterData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Generate last 4 quarters for selector
  const quarters = []
  const now = new Date()
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1)
    const q = Math.floor(d.getMonth() / 3) + 1
    quarters.push(`${d.getFullYear()}-Q${q}`)
  }
  const uniqueQuarters = [...new Set(quarters)]

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { start, end } = getQuarterRange(quarter)

      const [invoicesRes, expensesRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('subtotal, hst_amount, total, status')
          .in('status', ['paid', 'sent', 'overdue'])
          .gte('issue_date', start)
          .lte('issue_date', end),
        supabase
          .from('expenses')
          .select('amount, hst_paid')
          .gte('expense_date', start)
          .lte('expense_date', end),
      ])

      const invoices = invoicesRes.data ?? []
      const expenses = expensesRes.data ?? []

      const paidInvoices = invoices.filter(i => i.status === 'paid')

      setData({
        income: paidInvoices.reduce((s, i) => s + i.subtotal, 0),
        expenses: expenses.reduce((s, e) => s + e.amount, 0),
        hstCollected: invoices.reduce((s, i) => s + i.hst_amount, 0),
        hstPaid: expenses.reduce((s, e) => s + e.hst_paid, 0),
        invoiceCount: invoices.length,
        expenseCount: expenses.length,
      })
      setLoading(false)
    }
    load()
  }, [quarter])

  const netHST = data ? data.hstCollected - data.hstPaid : 0
  const profit = data ? data.income - data.expenses - netHST : 0

  return (
    <AppShell>
      <TopHeader title="Reports" subtitle={formatQuarter(quarter)} />
      <PageContainer>

        {/* Quarter selector */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5 overflow-x-auto">
          {uniqueQuarters.map(q => (
            <button
              key={q}
              onClick={() => setQuarter(q)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                quarter === q
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {q.replace('-', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <PageSkeleton />
        ) : data ? (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <StatCard
                label="Income"
                value={`$${data.income.toFixed(0)}`}
                icon={TrendingUp}
                accent="teal"
                sub={`${data.invoiceCount} paid invoice${data.invoiceCount !== 1 ? 's' : ''}`}
              />
              <StatCard
                label="Expenses"
                value={`$${data.expenses.toFixed(0)}`}
                icon={Receipt}
                accent="amber"
                sub={`${data.expenseCount} expense${data.expenseCount !== 1 ? 's' : ''}`}
              />
              <StatCard
                label="HST to remit"
                value={`$${netHST.toFixed(0)}`}
                icon={DollarSign}
                accent={netHST > 0 ? 'red' : 'slate'}
                sub="Collected minus credits"
              />
              <StatCard
                label="Est. profit"
                value={`$${profit.toFixed(0)}`}
                icon={BarChart2}
                accent="slate"
                sub="After HST remittance"
              />
            </div>

            {/* HST breakdown */}
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              HST summary
            </h2>
            <Card className="p-4 space-y-3 mb-5">
              {[
                {
                  label: 'HST collected on invoices',
                  value: `+$${data.hstCollected.toFixed(2)}`,
                  color: 'text-teal-600',
                },
                {
                  label: 'HST paid on expenses (ITC)',
                  value: `−$${data.hstPaid.toFixed(2)}`,
                  color: 'text-slate-500',
                },
                {
                  label: 'Net HST to remit to CRA',
                  value: `$${netHST.toFixed(2)}`,
                  color: netHST > 0 ? 'text-red-500 font-semibold' : 'text-green-600 font-semibold',
                },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">{row.label}</span>
                  <span className={row.color}>{row.value}</span>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-400 leading-relaxed">
                  File your HST return with the CRA quarterly. Keep all receipts for 6 years.
                  {netHST <= 0 && ' You have more input tax credits than HST collected this quarter.'}
                </p>
              </div>
            </Card>

            {/* Income breakdown */}
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Income breakdown
            </h2>
            <Card className="p-4 space-y-3">
              {[
                { label: 'Gross revenue (excl. HST)', value: `$${data.income.toFixed(2)}`, color: 'text-slate-700' },
                { label: 'Business expenses',          value: `−$${data.expenses.toFixed(2)}`, color: 'text-slate-500' },
                { label: 'HST remittance',             value: `−$${netHST.toFixed(2)}`, color: 'text-slate-500' },
                { label: 'Estimated net profit',       value: `$${profit.toFixed(2)}`, color: profit >= 0 ? 'text-teal-600 font-semibold' : 'text-red-500 font-semibold' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">{row.label}</span>
                  <span className={row.color}>{row.value}</span>
                </div>
              ))}
            </Card>
          </>
        ) : null}
      </PageContainer>
    </AppShell>
  )
}