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
import { ClientForm } from '@/components/clients/ClientForm'
import { useClients } from '@/lib/hooks/useClients'
import { usePlan } from '@/lib/hooks/usePlan'
import { Users, Plus, Phone, ChevronRight, Search, Lock } from 'lucide-react'
import type { Client, NewClient } from '@/lib/types'
import Link from 'next/link'

export default function ClientsPage() {
  const { clients, loading, error, addClient, updateClient, deleteClient } = useClients()
  const { isPro } = usePlan()
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | undefined>()
  const [search, setSearch] = useState('')

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return (
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q) ||
      (c.email ?? '').toLowerCase().includes(q)
    )
  })

  const handleAdd = async (data: NewClient) => {
    await addClient(data)
  }

  const handleEdit = async (data: NewClient) => {
    if (editingClient) await updateClient(editingClient.id, data)
  }

  const handleDelete = async () => {
    if (editingClient) await deleteClient(editingClient.id)
  }

  const openEdit = (client: Client) => {
    setEditingClient(client)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingClient(undefined)
  }

  return (
    <AppShell>
      <TopHeader
        title="Clients"
        subtitle={loading ? '' : `${clients.length} active client${clients.length !== 1 ? 's' : ''}`}
        action={
          !isPro && clients.length >= 5 ? (
            <Link href="/upgrade">
              <Button size="sm" variant="secondary">
                <Lock className="w-3.5 h-3.5" />
                5/5 clients
              </Button>
            </Link>
          ) : (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" />
              Add client
            </Button>
          )
        }
      />

      <PageContainer>
        {!isPro && clients.length >= 5 && (
          <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2.5 mb-4">
            <Lock className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
            <span className="flex-1">You&apos;ve reached the 5 client limit on the free plan.</span>
            <Link href="/upgrade" className="text-xs font-semibold text-teal-600 hover:text-teal-700 whitespace-nowrap">
              Upgrade →
            </Link>
          </div>
        )}

        {/* Search */}
        {clients.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white"
            />
          </div>
        )}

        {/* States */}
        {loading ? (
          <PageSkeleton />
        ) : error ? (
          <p className="text-sm text-red-500 text-center py-8">{error}</p>
        ) : clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No clients yet"
            description="Add your first client to start booking jobs and sending invoices."
            actionLabel="Add first client"
            onAction={() => setShowForm(true)}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No results"
            description={`No clients matching "${search}"`}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => (
              <Card
                key={c.id}
                className="p-4 flex items-center gap-3"
                onClick={() => openEdit(c)}
              >
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-teal-600">
                    {c.first_name[0]}{c.last_name[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-[15px] truncate">
                    {c.first_name} {c.last_name}
                  </p>
                  {c.phone && (
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                      <Phone className="w-3 h-3" strokeWidth={1.8} />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.address && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{c.address}, {c.city}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {c.notes && <Badge variant="gray">Notes</Badge>}
                  <ChevronRight className="w-4 h-4 text-slate-300" strokeWidth={1.8} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>

      {showForm && (
        <ClientForm
          client={editingClient}
          onSave={editingClient ? handleEdit : handleAdd}
          onClose={closeForm}
          onDelete={editingClient ? handleDelete : undefined}
        />
      )}
    </AppShell>
  )
}