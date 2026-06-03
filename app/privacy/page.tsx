import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export const metadata = { title: 'Privacy Policy — SparkClean' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-900 text-[15px]">
            Spark<span className="text-teal-500">Clean</span>
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-8">Effective: June 2026</p>

        <div className="space-y-8 text-sm text-slate-600 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">1. Who We Are</h2>
            <p>
              SparkClean is a software service operated by Russell Whitlock, based in Ottawa, Ontario, Canada. We help solo residential cleaners and small cleaning teams manage their business — scheduling, invoicing, expenses, and reporting.
            </p>
            <p className="mt-2">
              Contact us at <a href="mailto:hello@sparkclean.ca" className="text-teal-600 hover:underline">hello@sparkclean.ca</a> with any privacy questions.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">2. What Information We Collect</h2>
            <p className="mb-2">We collect information you provide directly when using SparkClean:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Account information</strong> — your email address and password (via Supabase Auth)</li>
              <li><strong>Business details</strong> — business name, address, phone, HST number</li>
              <li><strong>Client data</strong> — names, addresses, phone numbers, and emails of your clients</li>
              <li><strong>Job and scheduling data</strong> — appointment dates, times, prices, and notes</li>
              <li><strong>Financial records</strong> — invoices, expenses, mileage logs, and payment status</li>
              <li><strong>Receipt photos</strong> — images you upload for expense tracking</li>
              <li><strong>Team member info</strong> — names, emails, and hours of any team members you invite</li>
              <li><strong>Billing information</strong> — handled entirely by Stripe; we never store card numbers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">3. How We Use Your Information</h2>
            <p className="mb-2">We use your data solely to provide and improve SparkClean:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>To display and manage your schedule, clients, invoices, and reports</li>
              <li>To generate PDF invoices and estimates with your business details</li>
              <li>To process subscription payments through Stripe</li>
              <li>To scan receipts with AI (Anthropic Claude) — images are sent to Anthropic's API and not retained by them beyond the request</li>
              <li>To send team member invitation emails</li>
              <li>To troubleshoot errors and improve the service</li>
            </ul>
            <p className="mt-2">We do not sell your data, share it with advertisers, or use it for any purpose unrelated to operating SparkClean.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">4. Third-Party Services</h2>
            <p className="mb-2">SparkClean relies on the following third-party providers:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Supabase</strong> — database, file storage, and authentication. Data is stored on servers in the United States. <a href="https://supabase.com/privacy" className="text-teal-600 hover:underline" target="_blank" rel="noopener noreferrer">Supabase Privacy Policy</a></li>
              <li><strong>Stripe</strong> — payment processing. Card data never touches our servers. <a href="https://stripe.com/privacy" className="text-teal-600 hover:underline" target="_blank" rel="noopener noreferrer">Stripe Privacy Policy</a></li>
              <li><strong>Anthropic</strong> — AI receipt scanning. Receipt images are sent per-request and not retained for training. <a href="https://www.anthropic.com/privacy" className="text-teal-600 hover:underline" target="_blank" rel="noopener noreferrer">Anthropic Privacy Policy</a></li>
              <li><strong>Vercel</strong> — application hosting. <a href="https://vercel.com/legal/privacy-policy" className="text-teal-600 hover:underline" target="_blank" rel="noopener noreferrer">Vercel Privacy Policy</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">5. PIPEDA Compliance</h2>
            <p>
              As a Canadian service, SparkClean complies with the <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA). We collect only the information necessary to provide the service, obtain your meaningful consent at account creation, and give you access to your data upon request. You may withdraw consent at any time by deleting your account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">6. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. When you delete your account, your personal data and business records are permanently deleted from our database within 30 days. Receipt images stored in Supabase Storage are deleted immediately upon account deletion.
            </p>
            <p className="mt-2">
              Stripe may retain billing records for a longer period as required by financial regulations.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">7. Your Rights</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
              <li><strong>Correction</strong> — update or correct your information at any time within the app</li>
              <li><strong>Deletion</strong> — request deletion of your account and all associated data</li>
              <li><strong>Portability</strong> — request your data in a structured, machine-readable format</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, contact us at <a href="mailto:hello@sparkclean.ca" className="text-teal-600 hover:underline">hello@sparkclean.ca</a>.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">8. Security</h2>
            <p>
              All data is transmitted over HTTPS and stored in a secure database with row-level security policies. Authentication is handled by Supabase Auth with encrypted passwords. We do not have access to your Stripe payment details. While we take reasonable steps to protect your data, no system is perfectly secure.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify active users of material changes by email or by a notice within the app. Continued use of SparkClean after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">10. Contact</h2>
            <p>
              Russell Whitlock<br />
              SparkClean<br />
              Ottawa, Ontario, Canada<br />
              <a href="mailto:hello@sparkclean.ca" className="text-teal-600 hover:underline">hello@sparkclean.ca</a>
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
          <Link href="/terms" className="hover:text-teal-600 transition-colors">Terms of Service</Link>
          <Link href="/login" className="hover:text-teal-600 transition-colors">Back to SparkClean</Link>
        </div>
      </div>
    </div>
  )
}
