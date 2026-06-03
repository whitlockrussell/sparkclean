import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Sparkles, LayoutDashboard, CalendarDays, FileText, Receipt,
  UsersRound, Car, BarChart2, DollarSign, Smartphone, MapPin, Check,
} from 'lucide-react'
import { ScrollButton } from '@/components/landing/ScrollButton'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/today')

  return (
    <div className="scroll-smooth">

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="bg-teal-600 text-white px-6 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center">

          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight">SparkClean</span>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-white/15 border border-white/30 rounded-full px-3 py-1 text-xs font-medium mb-6">
            <MapPin className="w-3 h-3" />
            Built for Canadian cleaners
          </div>

          <h1 className="text-3xl lg:text-5xl font-bold leading-tight mb-5">
            Your entire cleaning business,<br className="hidden lg:block" /> run from your phone.
          </h1>
          <p className="text-teal-100 text-base lg:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Schedule jobs, send invoices, track expenses, and manage your team — all from one app that fits in your pocket.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="w-full sm:w-auto bg-white text-teal-700 font-semibold px-6 py-3 rounded-xl hover:bg-teal-50 transition-colors text-sm"
            >
              Start for free
            </Link>
            <ScrollButton />
          </div>
        </div>
      </section>

      {/* ── HIGHLIGHT BAND ──────────────────────────────────────────────────── */}
      <section className="bg-teal-50 px-6 py-14 lg:py-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-3 text-center lg:text-left">
            Look professional. Work smarter.
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-3 text-center lg:text-left">
            Send branded invoices right from the job site.
          </h2>
          <p className="text-slate-500 text-base mb-8 max-w-xl text-center lg:text-left">
            Finish a clean, tap to create an invoice, and send a professional PDF with your logo — all before you leave the driveway. No laptop needed.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-teal-100 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center mb-3">
                <Smartphone className="w-5 h-5 text-teal-600" strokeWidth={1.8} />
              </div>
              <p className="font-semibold text-slate-900 mb-1">Works on any phone</p>
              <p className="text-sm text-slate-500">Installs like a native app on iOS and Android. No App Store required.</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-teal-100 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-teal-600" strokeWidth={1.8} />
              </div>
              <p className="font-semibold text-slate-900 mb-1">One tap from job to invoice</p>
              <p className="text-sm text-slate-500">Mark a job done and create a pre-filled invoice in seconds, right from the schedule.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section id="features" className="bg-white px-6 py-14 lg:py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-10 text-center">
            Everything your business needs.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: LayoutDashboard, title: 'Today dashboard',      desc: 'See your day at a glance — jobs, payments owed, and weekly income.' },
              { icon: CalendarDays,    title: 'Smart scheduling',      desc: 'Book one-time or recurring jobs. Drag to reschedule. Never miss a clean.' },
              { icon: FileText,        title: 'Invoices & estimates',  desc: 'Professional PDFs with your logo, HST number, and payment tracking.' },
              { icon: Receipt,         title: 'Expense tracking',      desc: 'Log costs, capture receipts with AI, and track HST for CRA deductions.' },
              { icon: UsersRound,      title: 'Team management',       desc: 'Invite cleaners, track hours, and control what each person can see.' },
              { icon: Car,             title: 'Mileage tracker',       desc: 'Log trips and calculate CRA deductions automatically.' },
              { icon: BarChart2,       title: 'Reports & exports',     desc: 'Quarterly and annual HST reports. Export PDFs for your accountant.' },
              { icon: DollarSign,      title: 'Payment tracking',      desc: 'Mark jobs done, payments received, and see exactly who owes you.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-teal-600" strokeWidth={1.8} />
                </div>
                <p className="font-semibold text-slate-900 text-sm mb-1">{title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY SPARKCLEAN BAND ─────────────────────────────────────────────── */}
      <section className="bg-teal-600 text-white px-6 py-14 lg:py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-bold mb-10 text-center">
            Simple tools built for how you actually work.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Smartphone, stat: null,   label: 'Run your whole business from your phone' },
              { icon: null,       stat: '5 min', label: 'To get set up and running' },
              { icon: null,       stat: '100%',  label: 'Mobile-first, no laptop required' },
              { icon: MapPin,     stat: null,    label: 'Built for Canadian tax requirements' },
            ].map(({ icon: Icon, stat, label }, i) => (
              <div key={i} className="bg-white/10 border border-white/20 rounded-2xl p-5 text-center">
                {stat ? (
                  <p className="text-3xl font-bold mb-2">{stat}</p>
                ) : Icon ? (
                  <div className="flex justify-center mb-2">
                    <Icon className="w-8 h-8 opacity-90" strokeWidth={1.6} />
                  </div>
                ) : null}
                <p className="text-sm text-teal-100 leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section className="bg-white px-6 py-14 lg:py-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-10 text-center">
            Simple, honest pricing.
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">

            {/* Free */}
            <div className="border border-slate-200 rounded-2xl p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Free</p>
              <p className="text-3xl font-bold text-slate-900 mb-0.5">$0</p>
              <p className="text-xs text-slate-400 mb-5">forever</p>
              <ul className="space-y-2.5 text-sm text-slate-600">
                {[
                  'Up to 5 clients',
                  'Scheduling & invoicing',
                  'Basic expense tracking',
                  'Installs like an app',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-6 block text-center text-sm font-medium text-teal-600 border border-teal-200 rounded-xl py-2.5 hover:bg-teal-50 transition-colors"
              >
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div className="border-2 border-teal-500 rounded-2xl p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-teal-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  Most popular
                </span>
              </div>
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-2">Pro</p>
              <p className="text-3xl font-bold text-slate-900 mb-0.5">$19</p>
              <p className="text-xs text-slate-400 mb-5">USD per month</p>
              <ul className="space-y-2.5 text-sm text-slate-600">
                {[
                  'Unlimited clients',
                  'Estimates & quotes',
                  'Team management',
                  'AI receipt scanning',
                  'Mileage tracker',
                  'PDF reports',
                  'Priority support',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-6 block text-center text-sm font-semibold text-white bg-teal-500 rounded-xl py-2.5 hover:bg-teal-600 transition-colors"
              >
                Start for free
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-50 border-t border-slate-200 px-6 py-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>© 2026 SparkClean · Ottawa, Ontario, Canada</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-teal-600 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-teal-600 transition-colors">Terms of Service</Link>
            <a href="mailto:hello@sparkcleanapp.ca" className="hover:text-teal-600 transition-colors">hello@sparkcleanapp.ca</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
