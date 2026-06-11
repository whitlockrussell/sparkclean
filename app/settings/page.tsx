'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useBusiness } from '@/lib/hooks/useBusiness'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Building2, FileText, LogOut, Save, ChevronDown, ChevronUp, Camera, X, Moon, Calculator, Sparkles, CreditCard, Trash2, AlertTriangle, Receipt } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import type { BusinessUpdate } from '@/lib/hooks/useBusiness'
import { useTheme } from '@/components/ThemeProvider'
import { usePlan } from '@/lib/hooks/usePlan'

const provinces = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']

function UpgradedBanner() {
  const searchParams = useSearchParams()
  if (searchParams.get('upgraded') !== '1') return null
  return (
    <div className="flex items-center gap-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-2xl px-4 py-3.5 mb-4">
      <Sparkles className="w-5 h-5 text-teal-500 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">Welcome to Pro!</p>
        <p className="text-xs text-teal-600 dark:text-teal-400">All features are now unlocked.</p>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { business, loading, saveBusiness } = useBusiness()
  const { isPro, plan, currentPeriodEnd } = usePlan()
  const { theme, toggle: toggleTheme } = useTheme()
  const [openSection, setOpenSection] = useState<string | null>('business')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState<BusinessUpdate>({
    business_name: '',
    hst_number: '',
    address: '',
    city: '',
    province: 'ON',
    postal_code: '',
    phone: '',
    email: '',
    website: '',
    invoice_prefix: 'INV',
    invoice_notes: 'Thank you for your business!',
    tax_label: 'HST',
    tax_rate: 13,
    tax_number_label: 'HST#',
    tax_default_on: true,
    hourly_rate: 45,
  })

  useEffect(() => {
    if (business) {
      setForm({
        business_name: business.business_name ?? '',
        hst_number: business.hst_number ?? '',
        address: business.address ?? '',
        city: business.city ?? '',
        province: business.province ?? 'ON',
        postal_code: business.postal_code ?? '',
        phone: business.phone ?? '',
        email: business.email ?? '',
        website: business.website ?? '',
        invoice_prefix: business.invoice_prefix ?? 'INV',
        invoice_notes: business.invoice_notes ?? '',
        tax_label: business.tax_label ?? 'HST',
        tax_rate: business.tax_rate ?? 13,
        tax_number_label: business.tax_number_label ?? 'HST#',
        tax_default_on: business.tax_default_on ?? true,
        hourly_rate: business.hourly_rate ?? 45,
      })
    }
  }, [business])

  const set = (field: keyof BusinessUpdate, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const ext = file.name.split('.').pop()
      const path = `${user.id}/logo.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(path, file, { upsert: true })

      if (uploadError) throw new Error(uploadError.message)

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(path)

      // Add cache-busting param
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`
      setLogoPreview(urlWithCacheBust)
      await saveBusiness({ ...form, logo_url: publicUrl } as BusinessUpdate)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Logo upload failed.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSave = async () => {
    if (!form.business_name?.trim()) {
      setError('Business name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await saveBusiness(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/delete-account', { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Deletion failed')
      }
      await supabase.auth.signOut()
      router.push('/login')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleManageBilling = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to open billing portal')
      window.location.href = json.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPortalLoading(false)
    }
  }

  const toggle = (section: string) =>
    setOpenSection(prev => prev === section ? null : section)

  const inputClass = 'w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500'

  // Get current logo from business or preview
  const currentLogo = logoPreview || (business as unknown as { logo_url?: string })?.logo_url || null

  if (loading) return (
    <AppShell>
      <TopHeader title="Settings" />
      <PageContainer>
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      </PageContainer>
    </AppShell>
  )

  return (
    <AppShell>
      <TopHeader title="Settings" />
      <PageContainer>

        <Suspense fallback={null}>
          <UpgradedBanner />
        </Suspense>

        {/* Appearance */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Appearance</h2>
          <Card>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                <Moon className="w-4 h-4 text-teal-500" strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Dark mode</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Easier on the eyes at night</p>
              </div>
              <button
                onClick={toggleTheme}
                aria-label="Toggle dark mode"
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 ${
                  theme === 'dark' ? 'bg-teal-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </Card>
        </div>

        {/* Business details */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Business</h2>
          <Card>
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => toggle('business')}
            >
              <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-teal-500" strokeWidth={1.8} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Business details</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                  {form.business_name || 'Not set'} · HST: {form.hst_number || 'Not set'}
                </p>
              </div>
              {openSection === 'business'
                ? <ChevronUp className="w-4 h-4 text-slate-300" strokeWidth={1.8} />
                : <ChevronDown className="w-4 h-4 text-slate-300" strokeWidth={1.8} />
              }
            </button>

            {openSection === 'business' && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">

                {/* Logo upload */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Business logo</label>
                  <div className="flex items-center gap-3">
                    {currentLogo ? (
                      <div className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden flex-shrink-0">
                        <img src={currentLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                        <button
                          type="button"
                          onClick={() => setLogoPreview(null)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow flex items-center justify-center text-slate-400 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-300">
                        <Building2 className="w-6 h-6" strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="flex items-center gap-2 text-sm text-teal-600 font-medium hover:text-teal-700 transition-colors"
                      >
                        {uploadingLogo ? (
                          <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                        {currentLogo ? 'Change logo' : 'Upload logo'}
                      </button>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">PNG or JPG · Appears on invoices</p>
                    </div>
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Business name <span className="text-red-400">*</span></label>
                  <input type="text" value={form.business_name ?? ''} onChange={e => set('business_name', e.target.value)} placeholder="Sophie's Cleaning Co." className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">HST number</label>
                  <input type="text" value={form.hst_number ?? ''} onChange={e => set('hst_number', e.target.value)} placeholder="123456789RT0001" className={inputClass} />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">This appears on every invoice you send.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Phone</label>
                  <input type="tel" value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="613-555-0100" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Email</label>
                  <input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="sophie@cleaning.ca" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Street address</label>
                  <input type="text" value={form.address ?? ''} onChange={e => set('address', e.target.value)} placeholder="123 Main St" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">City</label>
                    <input type="text" value={form.city ?? ''} onChange={e => set('city', e.target.value)} placeholder="Ottawa" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Province</label>
                    <select value={form.province ?? 'ON'} onChange={e => set('province', e.target.value)} className={inputClass}>
                      {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Postal code</label>
                  <input type="text" value={form.postal_code ?? ''} onChange={e => set('postal_code', e.target.value.toUpperCase())} placeholder="K1N 5X5" maxLength={7} className={inputClass} />
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Invoice settings */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Invoices</h2>
          <Card>
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => toggle('invoice')}
            >
              <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-teal-500" strokeWidth={1.8} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Invoice defaults</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Prefix, footer note</p>
              </div>
              {openSection === 'invoice'
                ? <ChevronUp className="w-4 h-4 text-slate-300" strokeWidth={1.8} />
                : <ChevronDown className="w-4 h-4 text-slate-300" strokeWidth={1.8} />
              }
            </button>

            {openSection === 'invoice' && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Invoice prefix</label>
                  <input type="text" value={form.invoice_prefix ?? 'INV'} onChange={e => set('invoice_prefix', e.target.value.toUpperCase())} placeholder="INV" maxLength={6} className={inputClass} />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Invoices will be numbered INV-001, INV-002…</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Default invoice note</label>
                  <textarea
                    value={form.invoice_notes ?? ''}
                    onChange={e => set('invoice_notes', e.target.value)}
                    placeholder="Thank you for your business!"
                    rows={2}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Tax settings */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Tax</h2>
          <Card>
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => toggle('tax')}
            >
              <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                <Receipt className="w-4 h-4 text-teal-500" strokeWidth={1.8} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Tax settings</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{form.tax_label ?? 'HST'} · {form.tax_rate ?? 13}%</p>
              </div>
              {openSection === 'tax'
                ? <ChevronUp className="w-4 h-4 text-slate-300" strokeWidth={1.8} />
                : <ChevronDown className="w-4 h-4 text-slate-300" strokeWidth={1.8} />
              }
            </button>

            {openSection === 'tax' && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Tax label</label>
                  <input type="text" value={form.tax_label ?? 'HST'} onChange={e => set('tax_label', e.target.value)} placeholder="HST" className={inputClass} />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">e.g. HST, GST, PST, VAT, Sales Tax</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Tax rate</label>
                    <Tooltip text="Your standard tax rate applied to invoices. Set to 0 if you don't charge tax. For multiple taxes (e.g. GST + PST), enter your combined rate." />
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.tax_rate ?? 13}
                      onChange={e => set('tax_rate', parseFloat(e.target.value) || 0)}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Tax number label</label>
                  <input type="text" value={form.tax_number_label ?? 'HST#'} onChange={e => set('tax_number_label', e.target.value)} placeholder="HST#" className={inputClass} />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Label shown on invoices next to your tax number. Leave blank to hide.</p>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Apply tax to new invoices</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Tax is on by default when creating a new invoice</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, tax_default_on: !prev.tax_default_on }))}
                    aria-label="Toggle apply tax by default"
                    className={`relative w-11 h-6 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 ${
                      form.tax_default_on !== false ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${
                        form.tax_default_on !== false ? 'left-[22px]' : 'left-[2px]'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Estimates settings */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Estimates</h2>
          <Card>
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => toggle('estimates')}
            >
              <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                <Calculator className="w-4 h-4 text-teal-500" strokeWidth={1.8} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Estimate defaults</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Hourly rate for price calculator</p>
              </div>
              {openSection === 'estimates'
                ? <ChevronUp className="w-4 h-4 text-slate-300" strokeWidth={1.8} />
                : <ChevronDown className="w-4 h-4 text-slate-300" strokeWidth={1.8} />
              }
            </button>

            {openSection === 'estimates' && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Hourly rate</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={form.hourly_rate ?? 45}
                      onChange={e => set('hourly_rate', parseFloat(e.target.value) || 0)}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">/hr</span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Used as the default rate when creating new estimates.</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Billing */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Billing</h2>
          <Card>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isPro ? 'bg-teal-50 dark:bg-teal-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                {isPro
                  ? <Sparkles className="w-4 h-4 text-teal-500" strokeWidth={1.8} />
                  : <CreditCard className="w-4 h-4 text-slate-400" strokeWidth={1.8} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {isPro ? 'Pro plan' : 'Free plan'}
                </p>
                {isPro && currentPeriodEnd ? (
                  <p className="text-xs text-slate-400">
                    Renews {new Date(currentPeriodEnd).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500">Up to 5 clients · limited features</p>
                )}
              </div>
              {isPro ? (
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {portalLoading ? 'Loading…' : 'Manage'}
                </button>
              ) : (
                <a
                  href="/upgrade"
                  className="text-xs font-semibold text-white bg-teal-500 hover:bg-teal-600 transition-colors rounded-lg px-3 py-1.5 flex-shrink-0"
                >
                  Upgrade
                </a>
              )}
            </div>
          </Card>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 mb-3">{error}</p>}

        <Button size="lg" className="w-full mb-4" onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save settings'}
        </Button>

        <Button variant="danger" size="lg" className="w-full" onClick={handleSignOut}>
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>

        {/* Danger zone */}
        <div className="mt-6 mb-2">
          <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Danger zone</h2>
          <Card>
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors rounded-2xl"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4 text-red-500" strokeWidth={1.8} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Delete account</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Permanently remove your account and all data</p>
              </div>
            </button>
          </Card>
        </div>

        <div className="flex items-center justify-center gap-4 mt-6 pb-2">
          <a href="/privacy" className="text-xs text-slate-400 hover:text-teal-600 transition-colors">Privacy Policy</a>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <a href="/terms" className="text-xs text-slate-400 hover:text-teal-600 transition-colors">Terms of Service</a>
        </div>

      </PageContainer>

      {/* Delete account confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !deleting && setShowDeleteConfirm(false)} />
          <div className="relative w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col items-center text-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Delete your account?</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  This will permanently delete your account, all clients, jobs, invoices, expenses, and every other piece of data. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
              >
                {deleting ? 'Deleting…' : 'Yes, delete my account'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-60 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}