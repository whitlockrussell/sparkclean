import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import {
  CalendarDays, FileText, Receipt,
  UsersRound, Car, BarChart2, DollarSign, Check, LayoutDashboard,
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
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d7377 0%, #0a9396 40%, #14b8a6 100%)' }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }} />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-12 lg:py-16 flex flex-col lg:flex-row items-center gap-10">

          <div className="flex-1 text-left">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C12 2 13 7 17 8C13 9 12 14 12 14C12 14 11 9 7 8C11 7 12 2 12 2Z" />
                  <path d="M12 14C12 14 13 17.5 15.5 18.5C13 19.5 12 22 12 22C12 22 11 19.5 8.5 18.5C11 17.5 12 14 12 14Z" />
                  <path d="M5 10C5 10 5.8 12.5 7.5 13C5.8 13.5 5 16 5 16C5 16 4.2 13.5 2.5 13C4.2 12.5 5 10 5 10Z" />
                  <path d="M19 10C19 10 19.8 12.5 21.5 13C19.8 13.5 19 16 19 16C19 16 18.2 13.5 16.5 13C18.2 12.5 19 10 19 10Z" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-white tracking-tight">SparkClean</span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2 leading-snug">
              Simple tools for independent<br className="hidden sm:block" /> cleaning businesses.
            </h1>
            <p className="text-teal-100 text-base mb-6">Run your whole business from your phone.</p>

            <div className="flex flex-wrap gap-2 mb-8">
              {[
                { icon: '📅', label: 'Scheduling' },
                { icon: '📄', label: 'Invoicing' },
                { icon: '📊', label: 'Reports' },
              ].map(({ icon, label }) => (
                <span key={label} className="flex items-center gap-1.5 bg-white/15 text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20">
                  <span>{icon}</span>{label}
                </span>
              ))}
            </div>

            <p className="text-teal-200 text-base mb-8">
              ✦ Simple · Mobile-first · Free to start
            </p>

            <div className="flex flex-row gap-3">
              <Link
                href="/signup"
                className="bg-white text-teal-700 font-semibold px-6 py-2.5 rounded-xl hover:bg-teal-50 transition-colors text-sm text-center whitespace-nowrap inline-block"
              >
                Start for free
              </Link>
              <ScrollButton />
            </div>
            <a href="#install" className="text-teal-200 text-xs mt-3 inline-block hover:text-white transition-colors">
              📲 How to install on your phone →
            </a>
          </div>

          <div className="flex-shrink-0 flex justify-center lg:justify-end w-full lg:w-auto">
            <div className="flex items-end gap-4">
              <div className="relative" style={{ width: '240px' }}>
                <div className="bg-slate-900 rounded-[2.8rem] p-[10px] shadow-2xl ring-2 ring-white/10">
                  <div className="rounded-[1.8rem] overflow-hidden">
                    <Image src="/screenshots/today.jpg" alt="SparkClean today dashboard" width={400} height={800} className="w-full h-auto block" priority />
                  </div>
                </div>
              </div>
              <div className="relative mb-4" style={{ width: '240px' }}>
                <div className="bg-slate-900 rounded-[2.8rem] p-[10px] shadow-2xl ring-2 ring-white/10">
                  <div className="rounded-[1.8rem] overflow-hidden">
                    <Image src="/screenshots/weekly.jpg" alt="SparkClean weekly schedule" width={400} height={800} className="w-full h-auto block" priority />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ── */}
      <div className="border-y border-slate-800 py-4 px-6">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400 font-medium">
          {['Free to start', 'No credit card required', 'Tax ready', 'Mobile-first', 'Cancel anytime'].map(t => (
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
          <div className="flex justify-center mb-10">
            <div className="relative" style={{ width: '260px' }}>
              <div className="bg-slate-800 rounded-[2.8rem] p-[10px] shadow-2xl ring-1 ring-slate-700">
                <div className="rounded-[1.8rem] overflow-hidden">
                  <Image src="/screenshots/weekly.jpg" alt="Schedule" width={400} height={800} className="w-full h-auto block" />
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
                <div className="rounded-[1.8rem] overflow-hidden">
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
              <p className="font-semibold text-white text-sm mb-1">Tax calculated automatically</p>
              <p className="text-xs text-slate-400 leading-relaxed">Set your tax rate once in settings — applied instantly to every invoice.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-slate-800 mx-6" />

      {/* ── REPORTS ── */}
      <section className="px-6 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-4">Powerful reporting</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
            Tax reports ready<br className="hidden sm:block" /> for your accountant.
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto mb-10 leading-relaxed">
            SparkClean tracks income, expenses, and tax collected automatically. Quarterly and annual reports you can hand straight to your accountant.
          </p>
          <div className="flex justify-center mb-10">
            <div className="relative" style={{ width: '260px' }}>
              <div className="bg-slate-800 rounded-[2.8rem] p-[10px] shadow-2xl ring-1 ring-slate-700">
                <div className="rounded-[1.8rem] overflow-hidden">
                  <Image src="/screenshots/reports.jpg" alt="Reports" width={400} height={800} className="w-full h-auto block" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {['Tax tracking', 'Expense deductions', 'Quarterly reports', 'Accountant-ready'].map(tag => (
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
          <p className="text-slate-400 text-sm text-center mb-10">Built for independent cleaners and small teams.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: LayoutDashboard, title: 'Today dashboard',     desc: 'Jobs, money owed, and weekly income at a glance.' },
              { icon: CalendarDays,   title: 'Smart scheduling',     desc: 'One-time or recurring jobs. Never miss a clean.' },
              { icon: FileText,       title: 'Invoices & estimates', desc: 'Professional PDFs with your logo and tax details.' },
              { icon: Receipt,        title: 'Expense tracking',     desc: 'AI receipt scanning and tax deduction tracking.' },
              { icon: UsersRound,     title: 'Team management',      desc: 'Invite cleaners and control what they can see.' },
              { icon: Car,            title: 'Mileage tracker',      desc: 'Log trips and calculate mileage deductions.' },
              { icon: BarChart2,      title: 'Reports & exports',    desc: 'Tax reports and income summaries. Export PDFs for your accountant.' },
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

      {/* ── POWER FEATURES ── */}
      <section className="px-6 py-16 lg:py-20 bg-[#0a1a1a]">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3 text-center">Everything at your fingertips</p>
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2 text-center">Built for the job site, not a desk.</h2>
          <p className="text-slate-400 text-sm text-center mb-10">Every feature is one tap away on your phone.</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { emoji: '🤖', title: 'AI Receipt Scanner', desc: 'Point your camera at a receipt — SparkClean reads it and logs the expense automatically.' },
              { emoji: '📤', title: 'Send Invoice on the Spot', desc: 'Create and send a professional PDF invoice before you leave the driveway.' },
              { emoji: '🗺️', title: 'GPS Navigation', desc: 'Tap a client\'s address on their job card to open navigation instantly.' },
              { emoji: '💬', title: 'SMS Client Directly', desc: 'Tap to text your client straight from the job card. No copy-pasting numbers.' },
              { emoji: '📋', title: 'Estimate Builder', desc: 'Send professional quotes to potential clients and convert them to invoices in one tap.' },
              { emoji: '🎨', title: 'Your Logo & Branding', desc: 'Upload your logo — it appears on every invoice and estimate you send.' },
              { emoji: '⚙️', title: 'Flexible Tax Settings', desc: 'Set your tax label, rate, and number. Works for HST, GST, Sales Tax, or no tax at all.' },
              { emoji: '👥', title: 'Team Roles & Permissions', desc: 'Invite team members and control exactly what each person can see and do.' },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="bg-[#0d2020] rounded-2xl p-5 border border-slate-800">
                <div className="text-2xl mb-3">{emoji}</div>
                <p className="font-semibold text-white text-sm mb-1">{title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW TO INSTALL ── */}
      <section id="install" className="px-6 py-16 lg:py-20 bg-[#0d2020]">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3 text-center">No App Store needed</p>
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2 text-center">Install it like a native app.</h2>
          <p className="text-slate-400 text-sm text-center mb-10">SparkClean installs directly to your home screen on any device — no App Store, no downloads.</p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">

            {/* Android */}
            <div className="bg-[#0a1a1a] rounded-2xl p-6 border border-slate-800">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-teal-900 flex items-center justify-center text-xl">🤖</div>
                <p className="font-bold text-white text-base">Android</p>
              </div>
              <ol className="space-y-3">
                {[
                  'Open sparkcleanapp.ca in Chrome',
                  'Tap the 3 dots in the top right corner',
                  'Tap "Add to Home Screen"',
                  'Tap "Install" — done!',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* iPhone */}
            <div className="bg-[#0a1a1a] rounded-2xl p-6 border border-slate-800">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-teal-900 flex items-center justify-center text-xl">🍎</div>
                <p className="font-bold text-white text-base">iPhone</p>
              </div>
              <ol className="space-y-3">
                {[
                  'Open sparkcleanapp.ca in Safari',
                  'Tap the Share button (box with arrow ↑)',
                  'Tap "Add to Home Screen"',
                  'Tap "Add" — done!',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-slate-500 mt-4">💡 Safari recommended on iPhone for best experience</p>
            </div>

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
              { stat: 'Tax',   label: 'ready' },
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

            <div className="border-2 border-teal-500 rounded-2xl p-6 relative bg-[#0d2020]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-teal-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">Most popular</span>
              </div>
              <p className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-2">Pro</p>
              <p className="text-4xl font-bold text-white mb-0.5">$19</p>
              <p className="text-xs text-slate-500 mb-6">/ month</p>
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
          <p>© 2026 SparkClean</p>
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
