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
import { ExpenseForm } from '@/components/expenses/ExpenseForm'
import { useExpenses } from '@/lib/hooks/useExpenses'
import { usePlan } from '@/lib/hooks/usePlan'
import { Receipt, Plus, Pencil, Trash2 } from 'lucide-react'
import type { Expense, NewExpense } from '@/lib/types'

const categoryStyle: Record<string, 'teal' | 'amber' | 'gray'> = {
  supplies:  'teal',
  gas:       'amber',
  equipment: 'gray',
  insurance: 'gray',
  phone:     'gray',
  other:     'gray',
}

const categoryLabel: Record<string, string> = {
  supplies:  '🧹 Supplies',
  gas:       '⛽ Gas',
  equipment: '🔧 Equipment',
  insurance: '🛡️ Insurance',
  phone:     '📱 Phone',
  other:     '📦 Other',
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric',
  })
}

// Group expenses by month
function groupByMonth(expenses: Expense[]) {
  return expenses.reduce((groups, exp) => {
    const month = exp.expense_date.slice(0, 7) // YYYY-MM
    if (!groups[month]) groups[month] = []
    groups[month].push(exp)
    return groups
  }, {} as Record<string, Expense[]>)
}

function formatMonth(monthStr: string) {
  return new Date(monthStr + '-01').toLocaleDateString('en-CA', {
    month: 'long', year: 'numeric',
  })
}

export default function ExpensesPage() {
  const { expenses, loading, error, addExpense, updateExpense, deleteExpense } = useExpenses()
  const { isPro } = usePlan()
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>()

  const thisMonth = new Date().toISOString().slice(0, 7)
  const thisMonthExpenses = expenses.filter(e => e.expense_date.startsWith(thisMonth))
  const thisMonthTotal = thisMonthExpenses.reduce((s, e) => s + e.amount, 0)

  const grouped = groupByMonth(expenses)
  const sortedMonths = Object.keys(grouped).sort().reverse()

  const handleAdd = async (data: NewExpense) => { await addExpense(data) }
  const handleEdit = async (data: NewExpense) => {
    if (editingExpense) await updateExpense(editingExpense.id, data)
  }
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm('Delete this expense?')) await deleteExpense(id)
  }

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingExpense(undefined)
  }

  return (
    <AppShell>
      <TopHeader
        title="Expenses"
        subtitle={thisMonthTotal > 0 ? `$${thisMonthTotal.toFixed(2)} this month` : 'No expenses this month'}
        action={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" />
            Add expense
          </Button>
        }
      />

      <PageContainer>
        {loading ? (
          <PageSkeleton />
        ) : error ? (
          <p className="text-sm text-red-500 text-center py-8">{error}</p>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses logged"
            description="Track your business costs to get accurate HST and profit numbers."
            actionLabel="Log first expense"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <div className="space-y-6">
            {sortedMonths.map(month => {
              const monthExpenses = grouped[month]
              const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0)
              const monthHST = monthExpenses.reduce((s, e) => s + e.hst_paid, 0)

              return (
                <div key={month}>
                  {/* Month header */}
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {formatMonth(month)}
                    </p>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">${monthTotal.toFixed(2)}</p>
                      {monthHST > 0 && (
                        <p className="text-[10px] text-teal-600">ITC: ${monthHST.toFixed(2)}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {monthExpenses.map(exp => (
                      <Card key={exp.id} className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white text-[15px] truncate mb-1">
                              {exp.description}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant={categoryStyle[exp.category]}>
                                {categoryLabel[exp.category]}
                              </Badge>
                              <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(exp.expense_date)}</span>
                              {exp.hst_paid > 0 && (
                                <span className="text-xs text-teal-600">
                                  ITC ${exp.hst_paid.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <p className="text-[15px] font-semibold text-slate-700 dark:text-slate-200">
                              ${exp.amount.toFixed(2)}
                            </p>
                            <button
                              onClick={() => openEdit(exp)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-teal-500 hover:bg-teal-50 transition-colors"
                              aria-label="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, exp.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                              aria-label="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </PageContainer>

      {showForm && (
        <ExpenseForm
          expense={editingExpense}
          isPro={isPro}
          onSave={editingExpense ? handleEdit : handleAdd}
          onClose={closeForm}
        />
      )}
    </AppShell>
  )
}