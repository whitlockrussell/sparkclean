import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export const metadata = { title: 'Terms of Service — SparkClean' }

export default function TermsPage() {
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
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-8">Effective: June 2026</p>

        <div className="space-y-8 text-sm text-slate-600 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">1. Agreement</h2>
            <p>
              By creating an account or using SparkClean, you agree to these Terms of Service. SparkClean is operated by Russell Whitlock, based in Ottawa, Ontario, Canada. If you do not agree to these terms, do not use the service.
            </p>
            <p className="mt-2">
              Questions? Contact us at <a href="mailto:hello@sparkclean.ca" className="text-teal-600 hover:underline">hello@sparkclean.ca</a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">2. The Service</h2>
            <p>
              SparkClean is a business management tool designed for solo residential cleaners and small cleaning teams in Canada. It provides scheduling, invoicing, expense tracking, reporting, and related tools. We reserve the right to modify, suspend, or discontinue any part of the service at any time with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">3. Plans and Pricing</h2>

            <h3 className="text-sm font-semibold text-slate-700 mt-3 mb-1">Free Plan</h3>
            <p className="mb-2">The Free plan is available at no cost and includes:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 mb-3">
              <li>Up to 5 active clients</li>
              <li>Unlimited job scheduling</li>
              <li>Basic invoicing (no PDF download)</li>
              <li>Expense tracking (no AI receipt scanning)</li>
              <li>Basic HST reporting (no PDF export)</li>
            </ul>

            <h3 className="text-sm font-semibold text-slate-700 mb-1">Pro Plan</h3>
            <p className="mb-2">The Pro plan is <strong>$17 USD per month</strong> and includes everything in Free, plus:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Unlimited clients</li>
              <li>PDF invoice downloads</li>
              <li>AI receipt scanning</li>
              <li>PDF report exports</li>
              <li>Weekly calendar view</li>
              <li>Recurring jobs</li>
              <li>Mileage tracker</li>
              <li>Team management</li>
              <li>Estimates and quotes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">4. Billing and Payment</h2>
            <p>
              Pro plan subscriptions are billed monthly through Stripe. By subscribing, you authorize Stripe to charge your payment method on a recurring monthly basis.
            </p>
            <p className="mt-2">
              All prices are in US dollars (USD). Canadian users are responsible for any applicable taxes or currency conversion fees charged by their financial institution.
            </p>
            <p className="mt-2">
              If a payment fails, your account may be downgraded to the Free plan until payment is resolved. We will make reasonable attempts to notify you before downgrading.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">5. Cancellation Policy</h2>
            <p>
              You may cancel your Pro subscription at any time through the Stripe Customer Portal, accessible from Settings → Billing → Manage. Cancellation takes effect at the end of the current billing period — you retain full Pro access until that date. No partial refunds are issued for unused time within a billing period.
            </p>
            <p className="mt-2">
              We do not offer refunds except where required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">6. Acceptable Use</h2>
            <p className="mb-2">You agree not to use SparkClean to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Store false, misleading, or fraudulent business records</li>
              <li>Violate any applicable law or regulation</li>
              <li>Attempt to gain unauthorized access to other users' data</li>
              <li>Reverse-engineer, scrape, or interfere with the service</li>
              <li>Share your account credentials with others not authorized under your plan</li>
            </ul>
            <p className="mt-2">
              We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">7. Your Data</h2>
            <p>
              You own the data you enter into SparkClean — your client records, invoices, and business information are yours. By using the service, you grant us a limited license to store and process that data solely for the purpose of providing SparkClean to you.
            </p>
            <p className="mt-2">
              You are responsible for the accuracy of the data you enter and for complying with any applicable privacy laws when storing information about your clients.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">8. Limitation of Liability</h2>
            <p>
              SparkClean is provided &ldquo;as is&rdquo; without warranty of any kind. To the fullest extent permitted by law, Russell Whitlock and SparkClean shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service, including but not limited to lost revenue, lost data, or business interruption.
            </p>
            <p className="mt-2">
              Our total liability for any claim related to SparkClean shall not exceed the amount you paid in the three months preceding the claim.
            </p>
            <p className="mt-2">
              SparkClean is not a licensed accounting or tax professional service. Report data is provided as a convenience tool only. Consult a qualified accountant for CRA filings and HST remittances.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">9. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein. Any disputes arising from these Terms or your use of SparkClean shall be resolved in the courts of Ottawa, Ontario.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">10. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. We will provide at least 14 days&rsquo; notice of material changes by email or in-app notification. Continued use of SparkClean after the effective date constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-2">11. Contact</h2>
            <p>
              Russell Whitlock<br />
              SparkClean<br />
              Ottawa, Ontario, Canada<br />
              <a href="mailto:hello@sparkclean.ca" className="text-teal-600 hover:underline">hello@sparkclean.ca</a>
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
          <Link href="/privacy" className="hover:text-teal-600 transition-colors">Privacy Policy</Link>
          <Link href="/login" className="hover:text-teal-600 transition-colors">Back to SparkClean</Link>
        </div>
      </div>
    </div>
  )
}
