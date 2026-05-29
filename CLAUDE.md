# SparkClean — Claude Project Instructions

## Project Overview
SparkClean is a SaaS app for solo residential cleaners and tiny cleaning teams in Canada. It handles scheduling, invoicing (with HST), expenses, team management, and reporting.

## Tech Stack
- **Frontend:** Next.js 15, React, Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **Auth:** Supabase Auth with invite system for team members

## Live URLs
- **Production:** https://sparkclean-five.vercel.app
- **GitHub:** https://github.com/whitlockrussell/sparkclean
- **Supabase Project ID:** kbpfecncrewqhdkxvnws

## Project Structure
```
app/
  (dashboard)/        # Main app pages
  auth/               # Auth callbacks
  clients/            # Client management
  expenses/           # Expense tracking
  invoices/           # Invoice management
    [id]/             # Invoice PDF view
  login/              # Login page
  member/             # Team member dashboard
  reports/            # HST reports by quarter
  schedule/           # Job scheduling
  settings/           # Business settings + logo
  signup/             # Signup page
  team/               # Team management + clock in/out
  today/              # Main dashboard
  page.tsx            # Root redirect to /today
  layout.tsx          # Root layout with PWA meta tags

components/
  appointments/       # AppointmentForm
  clients/            # ClientForm
  expenses/           # ExpenseForm
  invoices/           # InvoiceForm, EditInvoiceForm
  layout/             # AppShell, BottomNav, Sidebar, TopHeader, PageContainer
  ui/                 # Button, Card, Badge, StatCard, EmptyState, Skeleton

lib/
  hooks/              # useAppointments, useClients, useExpenses, useInvoices, useTeam
  supabase/           # client.ts, server.ts
  nav.ts              # Navigation items
  types.ts            # TypeScript types

public/
  icons/              # icon-192.png, icon-512.png
  manifest.json       # PWA manifest
  sw.js               # Service worker
```

## What's Built
- ✅ Full auth with invite system for team members
- ✅ Clients (add, edit, delete, search)
- ✅ Schedule (book jobs, recurring, mark done, delete)
- ✅ Today dashboard (today's jobs, money owed, this week's income)
- ✅ Invoices (create, edit, delete, PDF, HST, logo, mark paid/unpaid)
- ✅ Expenses (add, edit, delete, AI receipt scanning, HST/ITC tracking)
- ✅ Reports (HST by quarter, income breakdown, expense summary)
- ✅ Settings (business details + logo upload)
- ✅ Team page (invite members, clock in/out, per-member permissions, manual hours)
- ✅ Member dashboard (limited view based on permissions)
- ✅ PWA (installable, teal sparkle icon, full screen)
- ✅ Mobile-first, works on Android + iOS
- ✅ Bottom nav with "More" drawer for Team, Reports, Settings

## Known Bugs / In Progress
1. **Back button closes the app** — Android back button exits PWA instead of navigating back
2. **Reports HST rounding** — showing $18 instead of $18.20 (needs `.toFixed(2)` fix)
3. **Reports label** — "Collected minus credits" should just say "For this quarter"
4. **Notification bell** — does nothing, needs to be removed or wired up
5. **Team permissions toggle** — partially fixed, may still have alignment issues on some devices

## Upcoming Features (Prioritized)
1. Rework team clock in/out to use start/end time input instead of live timer (Sophie's feedback — prevents forgotten clock-outs)
2. Weekly schedule view (see all jobs by day for rescheduling)
3. Quick invoice from completed job (one tap to create invoice pre-filled from job)
4. Payment method on invoices (cash, e-transfer, cheque)
5. Client notes visible on job card in schedule
6. Drag and drop job rescheduling
7. Mileage tracker (km × CRA rate = tax deduction)
8. Export reports to PDF for accountant

## Coding Standards
- Use TypeScript throughout
- Tailwind CSS for all styling — no inline styles except `background: rgba()`
- Teal (`teal-500`, `#0d9488`) is the primary brand color
- Amber (`amber-600`) for money/prices
- All forms are bottom sheet modals on mobile (`items-end` on mobile, `items-center` on desktop)
- Use existing UI components: `Button`, `Card`, `Badge`, `StatCard`, `EmptyState`, `PageSkeleton`
- Hooks handle all Supabase calls — pages just call hooks
- Never use `any` type
- Always handle loading and error states

## Database Tables (Supabase)
- `clients` — client profiles
- `appointments` — scheduled jobs
- `invoices` — invoice headers
- `invoice_items` — line items
- `expenses` — business expenses
- `businesses` — owner business settings + logo
- `team_members` — invited team members + permissions
- `time_entries` — clock in/out records
- `hours_log` — manually logged hours

## Key Business Logic
- **HST rate:** 13% (Ontario default)
- **Reports:** Based on invoices marked paid (not just completed jobs)
- **Dashboard "This week's income":** Based on completed jobs (Mon–Sun)
- **Team permissions:** Owner controls what each member can see/do
- **Invoice numbering:** Auto-incremented INV-001, INV-002, etc.
- **Recurring jobs:** Weekly, biweekly, monthly options
- **Canadian context:** HST, ITC (input tax credits), CRA reporting

## PWA Setup
- Manifest: `public/manifest.json`
- Service worker: `public/sw.js`
- Icons: `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Theme color: `#0d9488` (teal)
- Service worker excluded from middleware in `middleware.ts`

## Deployment
- Auto-deploys to Vercel on push to `main`
- Environment variables set in Vercel dashboard:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Git Workflow
Git is installed at `C:\Program Files\Git\bin\git.exe`
In new PowerShell terminals, run first:
```powershell
$env:PATH += ";C:\Program Files\Git\bin"
```
Then commit and push normally:
```powershell
git add .
git commit -m "description"
git push
```

## Developer Notes
- Owner: Russell Whitlock
- Target market: Solo residential cleaners and tiny teams in Canada
- Monetization plan: Free tier (limited clients) + paid tier ~$15-20/month
- Key differentiator: Simple, mobile-first, built for Canadian tax requirements
- Competitor: Jobber ($49-169/month, too complex for solo cleaners)
