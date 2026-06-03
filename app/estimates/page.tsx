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
import { EstimateForm } from '@/components/estimates/EstimateForm'
import { useEstimates } from '@/lib/hooks/useEstimates'
import { useClients } from '@/lib/hooks/useClients'
import { useInvoices } from '@/lib/hooks/useInvoices'
import { useBusiness } from '@/lib/hooks/useBusiness'
import { usePlan } from '@/lib/hooks/usePlan'
import { UpgradePrompt } from '@/components/ui/UpgradePrompt'
import { Calculator, Plus, Download, CheckCircle, XCircle, RotateCcw, FileText, Trash2 } from 'lucide-react'
import type { Estimate } from '@/lib/types'

type Tab = 'all' | 'pending' | 'accepted' | 'declined'

const statusVariant: Record<string, 'amber' | 'green' | 'red' | 'gray'> = {
  pending: 'amber',
  accepted: 'green',
  declined: 'red',
}

const CLEAN_TYPE_LABELS: Record<string, string> = {
  regular: 'Regular Cleaning',
  deep: 'Deep Cleaning',
  move_in: 'Move-In Cleaning',
  move_out: 'Move-Out Cleaning',
  post_construction: 'Post-Construction',
}

const SIZE_LABELS: Record<string, string> = {
  small: '<1,000 sqft',
  medium: '1,000–2,000 sqft',
  large: '2,000–3,000 sqft',
  xl: '3,000+ sqft',
}

const PROPERTY_LABELS: Record<string, string> = {
  house: 'House',
  condo: 'Condo',
  apartment: 'Apartment',
  commercial: 'Commercial',
}

const EXTRA_LABELS: Record<string, string> = {
  fridge: 'Inside fridge', oven: 'Inside oven', cabinets: 'Inside cabinets',
  windows: 'Windows', laundry: 'Laundry', wall_washing: 'Wall washing', garage: 'Garage',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return ''
  const datePart = dateStr.split('T')[0]
  return new Date(datePart + 'T12:00:00').toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric',
  })
}

export default function EstimatesPage() {
  const { isPro } = usePlan()
  const { estimates, loading, error, createEstimate, updateEstimate, markAccepted, markDeclined, markPending, deleteEstimate, refetch } = useEstimates()
  const { clients } = useClients()
  const { createInvoice } = useInvoices()
  const { business } = useBusiness()

  const [showForm, setShowForm] = useState(false)
  const [editEstimate, setEditEstimate] = useState<Estimate | null>(null)
  const [tab, setTab] = useState<Tab>('all')
  const [actionId, setActionId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null)

  if (!isPro) {
    return (
      <AppShell>
        <TopHeader title="Estimates" />
        <PageContainer>
          <UpgradePrompt
            feature="Estimates"
            description="Create professional price quotes and send them to potential clients before they book."
          />
        </PageContainer>
      </AppShell>
    )
  }

  const filtered = estimates.filter(est => {
    if (tab === 'pending') return est.status === 'pending'
    if (tab === 'accepted') return est.status === 'accepted'
    if (tab === 'declined') return est.status === 'declined'
    return true
  })

  const pendingCount = estimates.filter(e => e.status === 'pending').length

  const handleAccept = async (e: React.MouseEvent, est: Estimate) => {
    e.stopPropagation()
    setActionId(est.id)
    setActionError(null)
    try {
      await markAccepted(est.id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to accept estimate')
    } finally {
      setActionId(null)
    }
  }

  const handleDecline = async (e: React.MouseEvent, est: Estimate) => {
    e.stopPropagation()
    setActionId(est.id)
    setActionError(null)
    try {
      await markDeclined(est.id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to decline estimate')
    } finally {
      setActionId(null)
    }
  }

  const handleMarkPending = async (e: React.MouseEvent, est: Estimate) => {
    e.stopPropagation()
    setActionId(est.id)
    setActionError(null)
    try {
      await markPending(est.id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reopen estimate')
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (e: React.MouseEvent, est: Estimate) => {
    e.stopPropagation()
    if (!confirm(`Delete ${est.estimate_number}? This cannot be undone.`)) return
    setActionId(est.id)
    setActionError(null)
    try {
      await deleteEstimate(est.id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete estimate')
    } finally {
      setActionId(null)
    }
  }

  const handleConvertToInvoice = async (e: React.MouseEvent, est: Estimate) => {
    e.stopPropagation()
    setConvertingId(est.id)
    setActionError(null)
    try {
      const cleanLabel = CLEAN_TYPE_LABELS[est.clean_type] ?? est.clean_type
      const propLabel = PROPERTY_LABELS[est.property_type] ?? est.property_type
      const sizeLabel = SIZE_LABELS[est.size] ?? est.size
      const description = `${cleanLabel} — ${est.bedrooms}BR/${est.bathrooms}BA ${propLabel} (${sizeLabel})`
      await createInvoice({
        client_id: est.client_id,
        items: [{ description, quantity: 1, unit_price: est.subtotal }],
        hst_rate: 0.13,
        notes: est.notes ?? undefined,
      })
      setConvertSuccess(est.id)
      setTimeout(() => setConvertSuccess(null), 3000)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to convert to invoice')
    } finally {
      setConvertingId(null)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'declined', label: 'Declined' },
  ]

  return (
    <AppShell>
      <TopHeader
        title="Estimates"
        subtitle={pendingCount > 0 ? `${pendingCount} pending` : 'Price quotes for clients'}
        action={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" />
            New estimate
          </Button>
        }
      />

      <PageContainer>
        {estimates.length > 0 && (
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

        {actionError && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 mb-4">
            {actionError}
          </p>
        )}

        {loading ? (
          <PageSkeleton />
        ) : error ? (
          <p className="text-sm text-red-500 text-center py-8">{error}</p>
        ) : estimates.length === 0 ? (
          <EmptyState
            icon={Calculator}
            title="No estimates yet"
            description="Create a price estimate to send to a potential client."
            actionLabel="Create estimate"
            onAction={() => setShowForm(true)}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Calculator}
            title={`No ${tab} estimates`}
            description="Try a different filter."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map(est => {
              const client = est.clients
              const name = client ? `${client.first_name} ${client.last_name}` : 'Unknown'
              const isActing = actionId === est.id
              const isConverting = convertingId === est.id
              const justConverted = convertSuccess === est.id
              const cleanLabel = CLEAN_TYPE_LABELS[est.clean_type] ?? est.clean_type
              const propLabel = PROPERTY_LABELS[est.property_type] ?? est.property_type

              return (
                <Card key={est.id} className="p-4" onClick={() => setEditEstimate(est)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-slate-900 dark:text-white text-[15px] truncate">{name}</p>
                        <Badge variant={statusVariant[est.status] ?? 'gray'}>
                          {est.status.charAt(0).toUpperCase() + est.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {est.estimate_number} · {cleanLabel} · {est.bedrooms}BR/{est.bathrooms}BA {propLabel}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        Valid until {formatDate(est.valid_until)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[15px] font-semibold text-amber-600">
                        ${est.total.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">incl. HST</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                    <a
                      href={`/estimates/${est.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                    >
                      <Button size="sm" variant="ghost">
                        <Download className="w-3 h-3" />
                        PDF
                      </Button>
                    </a>

                    {est.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={isActing}
                          onClick={(e) => handleDecline(e, est)}
                        >
                          <XCircle className="w-3 h-3" />
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          loading={isActing}
                          onClick={(e) => handleAccept(e, est)}
                        >
                          <CheckCircle className="w-3 h-3" />
                          Accept
                        </Button>
                      </>
                    )}

                    {est.status === 'accepted' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={isActing}
                          onClick={(e) => handleMarkPending(e, est)}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reopen
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          loading={isConverting}
                          onClick={(e) => handleConvertToInvoice(e, est)}
                        >
                          <FileText className="w-3 h-3" />
                          {justConverted ? 'Invoice created!' : 'Convert to invoice'}
                        </Button>
                      </>
                    )}

                    {est.status === 'declined' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={isActing}
                        onClick={(e) => handleMarkPending(e, est)}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reopen
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      loading={isActing}
                      onClick={(e) => handleDelete(e, est)}
                      className="text-slate-300 hover:text-red-400 ml-auto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </PageContainer>

      {showForm && (
        <EstimateForm
          clients={clients}
          initialHourlyRate={business?.hourly_rate ?? 45}
          onSave={createEstimate}
          onClose={() => { setShowForm(false); refetch() }}
        />
      )}

      {editEstimate && (
        <EstimateForm
          clients={clients}
          initialHourlyRate={business?.hourly_rate ?? 45}
          initialValues={editEstimate}
          onSave={(data) => updateEstimate(editEstimate.id, data)}
          onClose={() => setEditEstimate(null)}
        />
      )}
    </AppShell>
  )
}
