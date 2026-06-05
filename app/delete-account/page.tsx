import Link from 'next/link'
import { Sparkles, Smartphone, Mail } from 'lucide-react'

export const metadata = { title: 'Delete Account — SparkClean' }

export default function DeleteAccountPage() {
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
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Delete Your Account</h1>
        <p className="text-sm text-slate-400 mb-8">You can request account deletion at any time.</p>

        <div className="space-y-4 text-sm text-slate-600 leading-relaxed mb-10">
          <p>
            Deleting your SparkClean account permanently removes your profile and all associated data — including clients, jobs, invoices, expenses, mileage logs, and team members. This action cannot be undone.
          </p>
          <p>
            There are two ways to delete your account:
          </p>
        </div>

        <div className="space-y-4">
          {/* Option 1 — in-app */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-teal-500" strokeWidth={1.8} />
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1">Delete from within the app</p>
              <p className="text-sm text-slate-500">
                Open SparkClean, go to <strong>Settings</strong>, scroll to the bottom, and tap <strong>Delete account</strong>. You&apos;ll be asked to confirm before anything is deleted.
              </p>
            </div>
          </div>

          {/* Option 2 — email */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-teal-500" strokeWidth={1.8} />
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1">Email us a request</p>
              <p className="text-sm text-slate-500 mb-2">
                Send an email from the address associated with your account and we&apos;ll delete it within 3 business days.
              </p>
              <a
                href="mailto:hello@sparkcleanapp.ca?subject=Account%20Deletion%20Request"
                className="inline-flex items-center gap-1.5 text-teal-600 font-medium hover:text-teal-700 transition-colors"
              >
                hello@sparkcleanapp.ca
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
          <Link href="/privacy" className="hover:text-teal-600 transition-colors">Privacy Policy</Link>
          <Link href="/login" className="hover:text-teal-600 transition-colors">Back to SparkClean</Link>
        </div>
      </div>
    </div>
  )
}
