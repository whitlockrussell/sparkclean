import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import {
  CalendarDays, FileText, Receipt,
  UsersRound, Car, BarChart2, DollarSign, Smartphone, MapPin, Check, LayoutDashboard,
} from 'lucide-react'
import { ScrollButton } from '@/components/landing/ScrollButton'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/today')

  const params = await searchParams
  if (params.error_code || params.error) {
    const message = params.error_code === 'otp_expired'
      ? 'Your password reset link has expired. Please request a new one.'
      : 'That link is no longer valid. Please try again.'
    redirect(`/login?message=${encodeURIComponent(message)}`)
  }

  return (
    <div className="bg-[#0a1a1a] text-white">

      {/* ── HERO ── */}
      <section className="bg-teal-700">
        <Image
          src="/screenshots/banner.png"
          alt="SparkClean"
          width={1024}
          height={500}
          className="w-full h-auto max-w-5xl mx-auto block"
          quality={100}
          priority
        />
        <div className="bg-teal-800 px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xs mx-auto">
            <Link
              href="/signup"
              className="w-full bg-white text-teal-700 font-semibold px-6 py-3 rounded-xl hover:bg-teal-50 transition-colors text-sm text-center"
            >
              Start for free
            </Link>
            <ScrollButton />
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ── */}
      <div className="border-y border-slate-800 py-4 px-6">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
          {['Free to start', 'No credit card required', 'HST & CRA ready', 'Built for Canadian cleaners', 'Cancel anytime'].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-teal-500 inline-block" />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ── SCHEDULE ── */}
      <section className="px-6 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-4">Smart scheduling</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
            See your whole week<br className="hidden sm:block" /> at a glance.
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto mb-10 leading-relaxed">
            Book one-time or recurring jobs, and see all your clients colour-coded by day. Never miss a clean.
          </p>
          {/* Phone mockup centered */}
          <div className="flex justify-center mb-10">
            <div className="relative" style={{ width: '260px' }}>
              <div className="bg-slate-800 rounded-[2.8rem] p-[10px] shadow-2xl ring-1 ring-slate-700">
                <div className="absolute top-[18px] left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-800 rounded-full z-10" />
                <div className="rounded-[2.2rem] overflow-hidden">
                  <Image src="/screenshots/schedule.jpg" alt="Schedule" width={400} height={800} className="w-full h-auto block" />
                </div>
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto">
            <div className="bg-[#0d2020] border border-slate-800 rounded-2xl p-5 text-left">
              <p className="font-semibold text-white text-sm mb-1">Recurring jobs</p>
              <p className="text-xs text-slate-400 leading-relaxed">Set weekly, biweekly, or monthly — SparkClean handles the rest.</p>
            </div>
            <div className="bg-[#0d2020] border border-slate-800 rounded-2xl p-5 text-left">
              <p className="font-semibold text-white text-sm mb-1">Colour-coded clients</p>
              <p className="text-xs text-slate-400 leading-relaxed">Every client gets their own colour so your week is instantly readable.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div className="border-t border-slate-800 mx-6" />

      {/* ── INVOICES ── */}
      <section className="px-6 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-4">Invoicing</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
            Professional invoices<br className="hidden sm:block" /> sent from the job site.
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto mb-10 leading-relaxed">
            Finish a clean, tap to create an invoice, and send a professional PDF with your logo — all before you leave the driveway.
          </p>
          <div className="flex justify-center mb-10">
            <div className="relative" style={{ width: '260px' }}>
              <div className="bg-slate-800 rounded-[2.8rem] p-[10px] shadow-2xl ring-1 ring-slate-700">
                <div className="absolute top-[18px] left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-800 rounded-full z-10" />
                <div className="rounded-[2.2rem] overflow-hidden">
                  <Image src="/screenshots/invoices.jpg" alt="Invoices" width={400} height={800} className="w-full h-auto block" />
                </div>
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto">
            <div className="bg-[#0d2020] border border-slate-800 rounded-2xl p-5 text-left">
              <p className="font-semibold text-white text-sm mb-1">Your logo, your brand</p>
              <p className="text-xs text-slate-400 leading-relaxed">Upload your logo and every invoice looks like it came from a real business.</p>
            </div>
            <div className="bg-[#0d2020] border border-slate-800 rounded-2xl p-5 text-left">
              <p className="font-semibold text-white text-sm mb-1">HST calculated automatically</p>
              <p className="text-xs text-slate-400 leading-relaxed">Ontario HST at 13% applied instantly. No manual math.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div className="border-t border-slate-800 mx-6" />

      {/* ── REPORTS ── */}
      <section className="px-6 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-4">Built for Canada</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
            HST reports ready<br className="hidden sm:block" /> for your accountant.
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto mb-10 leading-relaxed">
            SparkClean tracks HST collected and input tax credits automatically. Quarterly reports you can hand straight to your accountant.
          </p>
          <div className="flex justify-center mb-10">
            <div className="relative" style={{ width: '260px' }}>
              <div className="bg-slate-800 rounded-[2.8rem] p-[10px] shadow-2xl ring-1 ring-slate-700">
                <div className="absolute top-[18px] left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-800 rounded-full z-10" />
                <div className="rounded-[2.2rem] overflow-hidden">
                  <Image src="/screenshots/reports.jpg" alt="Reports" width={400} height={800} className="w-full h-auto block" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {['HST tracking', 'ITC deductions', 'Quarterly reports', 'CRA-ready'].map(tag => (
              <span key={tag} className="bg-[#0d2020] text-teal-400 text-xs font-medium px-4 py-2 rounded-full border border-slate-800">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section id="features" className="bg-[#0d2020] px-6 py-16 lg:py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2 text-center">
            Everything you need. Nothing you don't.
          </h2>
          <p className="text-slate-400 text-sm text-center mb-10">Built specifically for solo cleaners and small teams in Canada.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: LayoutDashboard, title: 'Today dashboard',     desc: 'Jobs, money owed, and weekly income at a glance.' },
              { icon: CalendarDays,   title: 'Smart scheduling',     desc: 'One-time or recurring jobs. Never miss a clean.' },
              { icon: FileText,       title: 'Invoices & estimates', desc: 'Professional PDFs with your logo and HST number.' },
              { icon: Receipt,        title: 'Expense tracking',     desc: 'AI receipt scanning and HST deduction tracking.' },
              { icon: UsersRound,     title: 'Team management',      desc: 'Invite cleaners and control what they can see.' },
              { icon: Car,            title: 'Mileage tracker',      desc: 'Log trips and calculate CRA deductions.' },
              { icon: BarChart2,      title: 'Reports & exports',    desc: 'Quarterly HST reports. Export PDFs for your accountant.' },
              { icon: DollarSign,     title: 'Payment tracking',     desc: 'See exactly who owes you and what\'s been paid.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-[#0a1a1a] rounded-2xl p-5 border border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-teal-950 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-teal-400" strokeWidth={1.8} />
                </div>
                <p className="font-semibold text-white text-sm mb-1">{title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAL BAND ── */}
      <section className="bg-teal-600 px-6 py-14">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
            Built for how you actually work.
          </h2>
          <p className="text-teal-100 text-sm mb-8 leading-relaxed">
            Run your whole business from your phone. No laptop, no complicated software, no Jobber pricing.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { stat: '$0',    label: 'to start' },
              { stat: '5 min', label: 'to set up' },
              { stat: '100%',  label: 'mobile-first' },
              { stat: 'HST',   label: 'built in' },
            ].map(({ stat, label }) => (
              <div key={stat} className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-white mb-1">{stat}</p>
                <p className="text-xs text-teal-100">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="bg-[#0a1a1a] px-6 py-16 lg:py-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2 text-center">Simple, honest pricing.</h2>
          <p className="text-slate-400 text-sm text-center mb-10">No contracts. Cancel anytime.</p>
          <div className="grid sm:grid-cols-2 gap-5">

            {/* Free */}
            <div className="border border-slate-800 rounded-2xl p-6 bg-[#0d2020]">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Free</p>
              <p className="text-4xl font-bold text-white mb-0.5">$0</p>
              <p className="text-xs text-slate-500 mb-6">forever</p>
              <ul className="space-y-3 text-sm text-slate-300 mb-6">
                {['Up to 5 clients', 'Scheduling & invoicing', 'Basic expense tracking', 'Installs like an app'].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-slate-600 flex-shrink-0" strokeWidth={2} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="block text-center text-sm font-medium text-teal-400 border border-slate-700 rounded-xl py-2.5 hover:bg-slate-800 transition-colors">
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div className="border-2 border-teal-500 rounded-2xl p-6 relative bg-[#0d2020]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-teal-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">Most popular</span>
              </div>
              <p className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-2">Pro</p>
              <p className="text-4xl font-bold text-white mb-0.5">$19</p>
              <p className="text-xs text-slate-500 mb-6">CAD / month</p>
              <ul className="space-y-3 text-sm text-slate-300 mb-6">
                {['Unlimited clients', 'Estimates & quotes', 'Team management', 'AI receipt scanning', 'Mileage tracker', 'PDF reports', 'Priority support'].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-teal-500 flex-shrink-0" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="block text-center text-sm font-semibold text-white bg-teal-500 rounded-xl py-2.5 hover:bg-teal-400 transition-colors">
                Start for free
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0d2020] border-t border-slate-800 px-6 py-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© 2026 SparkClean · Ottawa, Ontario, Canada</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-teal-400 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-teal-400 transition-colors">Terms of Service</Link>
            <a href="mailto:hello@sparkcleanapp.ca" className="hover:text-teal-400 transition-colors">hello@sparkcleanapp.ca</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
