'use client'

import { useState, useEffect, useRef } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useBusiness } from '@/lib/hooks/useBusiness'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Building2, FileText, LogOut, Save, ChevronDown, ChevronUp, Camera, X, Moon } from 'lucide-react'
import type { BusinessUpdate } from '@/lib/hooks/useBusiness'
import { useTheme } from '@/components/ThemeProvider'

const provinces = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']

export default function SettingsPage() {
  const { business, loading, saveBusiness } = useBusiness()
  const { theme, toggle: toggleTheme } = useTheme()
  const [openSection, setOpenSection] = useState<string | null>('business')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
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
      })
    }
  }, [business])

  const set = (field: keyof BusinessUpdate, value: string) =>
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

        {/* Appearance */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Appearance</h2>
          <Card>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                <Moon className="w-4 h-4 text-teal-500" strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Dark mode</p>
                <p className="text-xs text-slate-400">Easier on the eyes at night</p>
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
                <p className="text-xs text-slate-400 truncate">
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
                      <p className="text-[11px] text-slate-400 mt-1">PNG or JPG · Appears on invoices</p>
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
                  <p className="text-[11px] text-slate-400 mt-1">This appears on every invoice you send.</p>
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
                <p className="text-xs text-slate-400">Prefix, footer note</p>
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
                  <p className="text-[11px] text-slate-400 mt-1">Invoices will be numbered INV-001, INV-002…</p>
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

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 mb-3">{error}</p>}

        <Button size="lg" className="w-full mb-4" onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save settings'}
        </Button>

        <Button variant="danger" size="lg" className="w-full" onClick={handleSignOut}>
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>

      </PageContainer>
    </AppShell>
  )
}