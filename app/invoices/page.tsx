'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { InvoiceForm } from '@/components/invoices/InvoiceForm'
import { EditInvoiceForm } from '@/components/invoices/EditInvoiceForm'
import { useInvoices } from '@/lib/hooks/useInvoices'
import { useClients } from '@/lib/hooks/useClients'
import { usePlan } from '@/lib/hooks/usePlan'
import { createClient } from '@/lib/supabase/client'
import { FileText, Plus, CheckCircle, Send, Download, Pencil, RotateCcw, Lock } from 'lucide-react'
import Link from 'next/link'
import type { Invoice } from '@/lib/types'
import type { NewInvoice } from '@/lib/hooks/useInvoices'

type Tab = 'all' | 'unpaid' | 'paid'

const statusVariant: Record<string, 'amber' | 'red' | 'green' | 'gray' | 'teal'> = {
  draft:     'gray',
  sent:      'amber',
  overdue:   'red',
  paid:      'green',
  cancelled: 'gray',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return ''
  // Handle full ISO timestamps by extracting just the date part
  const datePart = dateStr.split('T')[0]
  return new Date(datePart + 'T12:00:00').toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric',
  })
}

export default function InvoicesPage() {
  const { invoices, loading, error, createInvoice, markPaid, markUnpaid, markSent, refetch } = useInvoices()
  const { clients } = useClients()
  const { isPro } = usePlan()
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [tab, setTab] = useState<Tab>('all')
  const [actionId, setActionId] = useState<string | null>(null)

  const filtered = invoices.filter(inv => {
    if (tab === 'unpaid') return ['draft', 'sent', 'overdue'].includes(inv.status)
    if (tab === 'paid') return inv.status === 'paid'
    return true
  })

  const unpaidTotal = invoices
    .filter(i => ['sent', 'overdue'].includes(i.status))
    .reduce((s, i) => s + i.total, 0)

  const handleCreate = async (data: NewInvoice) => {
    await createInvoice(data)
  }

  const handleMarkPaid = async (e: React.MouseEvent, inv: Invoice) => {
    e.stopPropagation()
    setActionId(inv.id)
    try { await markPaid(inv.id) } finally { setActionId(null) }
  }

  const handleMarkUnpaid = async (e: React.MouseEvent, inv: Invoice) => {
    e.stopPropagation()
    setActionId(inv.id)
    try { await markUnpaid(inv.id) } finally { setActionId(null) }
  }

  const handleMarkSent = async (e: React.MouseEvent, inv: Invoice) => {
    e.stopPropagation()
    setActionId(inv.id)
    try { await markSent(inv.id) } finally { setActionId(null) }
  }

  const handleDeleteInvoice = async () => {
    if (!editingInvoice) return
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', editingInvoice.id)
    if (error) throw new Error(error.message)
    refetch()
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unpaid', label: 'Unpaid' },
    { key: 'paid', label: 'Paid' },
  ]

  return (
    <AppShell>
      <TopHeader
        title="Invoices"
        subtitle={unpaidTotal > 0 ? `$${unpaidTotal.toFixed(2)} outstanding` : 'All paid up'}
        action={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" />
            New invoice
          </Button>
        }
      />

      <PageContainer>
        {invoices.length > 0 && (
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-4">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <PageSkeleton />
        ) : error ? (
          <p className="text-sm text-red-500 text-center py-8">{error}</p>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Create your first invoice to start getting paid."
            actionLabel="Create invoice"
            onAction={() => setShowForm(true)}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={tab === 'unpaid' ? 'No unpaid invoices' : 'No paid invoices yet'}
            description={tab === 'unpaid' ? 'All invoices are paid up.' : 'Mark invoices as paid when you receive payment.'}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map(inv => {
              const client = inv.clients
              const name = client ? `${client.first_name} ${client.last_name}` : 'Unknown'
              const isActing = actionId === inv.id

              return (
                <Card key={inv.id} className="p-4" onClick={() => setEditingInvoice(inv)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-slate-900 dark:text-white text-[15px] truncate">{name}</p>
                        <Badge variant={statusVariant[inv.status]}>
                          {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400">
                        {inv.invoice_number}
                        {inv.due_date && ` · Due ${formatDate(inv.due_date)}`}
                        {inv.paid_at && ` · Paid ${formatDate(inv.paid_at)}`}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-[15px] font-semibold ${
                        inv.status === 'paid' ? 'text-slate-400' : 'text-amber-600'
                      }`}>
                        ${inv.total.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-400">incl. HST</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                    {isPro ? (
                      <a
                        href={`/invoices/${inv.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                      >
                        <Button size="sm" variant="ghost">
                          <Download className="w-3 h-3" />
                          PDF
                        </Button>
                      </a>
                    ) : (
                      <Link href="/upgrade" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="text-slate-400">
                          <Lock className="w-3 h-3" />
                          PDF
                        </Button>
                      </Link>
                    )}

                    {inv.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); setEditingInvoice(inv) }}
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </Button>
                    )}

                    {inv.status === 'paid' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={isActing}
                        onClick={(e) => handleMarkUnpaid(e, inv)}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Mark unpaid
                      </Button>
                    )}

                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <>
                        {inv.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={isActing}
                            onClick={(e) => handleMarkSent(e, inv)}
                          >
                            <Send className="w-3 h-3" />
                            Mark sent
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="primary"
                          loading={isActing}
                          onClick={(e) => handleMarkPaid(e, inv)}
                        >
                          <CheckCircle className="w-3 h-3" />
                          Mark paid
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </PageContainer>

      {showForm && (
        <InvoiceForm
          clients={clients}
          onSave={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}

      {editingInvoice && (
        <EditInvoiceForm
          invoice={editingInvoice}
          clients={clients}
          onSave={refetch}
          onClose={() => setEditingInvoice(null)}
          onDelete={handleDeleteInvoice}
        />
      )}
    </AppShell>
  )
}