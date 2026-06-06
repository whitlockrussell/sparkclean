# SparkClean — CLAUDE.md

## Project Overview
SparkClean is a mobile-first SaaS app for solo residential cleaners and tiny cleaning teams in Canada. Handles scheduling, invoicing (HST), expenses, team management, mileage tracking, and reporting.

**Owner:** Russell Whitlock  
**Target market:** Solo residential cleaners and tiny teams in Canada  
**Monetization:** Freemium — free tier (limited clients) + paid tier ~$15-20/month via Stripe  
**Key differentiator:** Simple, mobile-first, built for Canadian tax requirements  
**Competitor:** Jobber ($49-169/month, too complex for solo cleaners)

---

## Tech Stack
- **Frontend:** Next.js 15, React, Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **Auth:** Supabase Auth with invite system for team members
- **Payments:** Stripe (freemium feature gating)

## Live URLs
- **Production:** https://sparkcleanapp.ca
- **GitHub:** https://github.com/whitlockrussell/sparkclean
- **Supabase Project ID:** kbpfecncrewqhdkxvnws

---

## What's Built & Shipped ✅
- Full auth with invite system for team members
- Clients (add, edit, delete, search)
- Schedule (book jobs, recurring, mark done, delete)
- Today dashboard (today's jobs, money owed, this week's income)
- Invoices (create, edit, delete, PDF, HST, logo, mark paid/unpaid)
- Payment method on invoices (cash, e-transfer, cheque)
- Quick invoice creation from completed jobs
- Expenses (add, edit, delete, AI receipt scanning, HST/ITC tracking)
- Reports (HST by quarter, income breakdown, expense summary)
- Quarterly and annual PDF report export
- Settings (business details + logo upload)
- Team page (invite members, clock in/out via start/end time, per-member permissions, manual hours)
- Member dashboard (limited view based on permissions)
- Weekly calendar view with time-based positioning and drag-and-drop rescheduling
- Per-client colour coding on weekly calendar
- Recurring job generation with edit/delete scope prompts
- Mileage tracker with CRA tiered rate calculations
- PWA (installable, teal sparkle icon, full screen)
- Mobile-first, works on Android + iOS
- Bottom nav with "More" drawer for Team, Reports, Settings
- Stripe integration with freemium feature gating
- Security/RLS audit completed
- Delete account functionality
- Pro email created
- assetlinks.json hosted at https://sparkcleanapp.ca/.well-known/assetlinks.json (TWA support)

## Known Bugs Fixed ✅
- Toggle CSS bug (using explicit pixel `left` positions)
- Reports HST rounding (`.toFixed(2)`)
- Reports label ("Collected minus credits" → "For this quarter")
- Notification bell removed
- Team permissions toggle alignment
- Android back button PWA navigation
- Job status rework (Job Done + Payment Received toggles)

---

## In Progress / To Do 🔲

### High Priority
1. **Recurring jobs 3-month cap** — cap recurring job generation at 3 months out to prevent Supabase overload; add in-app reminder to extend when approaching the cap
2. **Landing page redesign** — needs updated screenshots and a fresh design
3. **Security audit** — Claude Code audit of RLS policies, auth flows, API routes, and common vulnerabilities; consider hiring a professional pen tester once revenue justifies it

### Medium Priority
4. **Admin dashboard** — internal page for Russell to see all signups at a glance (name, email, plan, last active); Stripe + Supabase dashboards are usable in the meantime
5. **Play Store screenshots** — needed for store listing

### Play Store / Launch
- Google Play closed testing (Alpha) submitted and in review
- Need 12 testers opted-in (currently ~9 emails collected)
- Once approved: share opt-in link → 14 day clock starts → apply for production
- Russell and Sophie count as testers by clicking the opt-in link on their Android phones (no new account needed)

---

## Coding Standards
- Use TypeScript throughout — never use `any` type
- Tailwind CSS for all styling — no inline styles except `background: rgba()`
- Teal (`teal-500`, `#0d9488`) is the primary brand color
- Amber (`amber-600`) for money/prices
- All forms are bottom sheet modals on mobile (`items-end` on mobile, `items-center` on desktop)
- Use existing UI components: `Button`, `Card`, `Badge`, `StatCard`, `EmptyState`, `PageSkeleton`
- Hooks handle all Supabase calls — pages just call hooks
- Always handle loading and error states

## Key Patterns & Lessons Learned
- **Toggle CSS:** Use explicit pixel `left` positions (`after:left-[2px]` / `after:left-[22px]`) — `translate-x` causes persistent bugs
- **Vercel builds:** JSX IIFE syntax and TypeScript casting issues cause deployment failures — scrutinize before pushing
- **Supabase schema changes:** Require care around status constraints and RLS policies
- **Russell's workflow:** Send multi-task prompts to Claude Code, approve edits in bulk (option 2)
- **Terminal:** Right-click to paste in Cursor terminal (Ctrl+V unreliable on Windows)
- **Git:** `$env:PATH += ";C:\Program Files\Git\bin"` required in new PowerShell terminals

## Database Tables
- `clients` — client profiles
- `appointments` — scheduled jobs
- `invoices` — invoice headers
- `invoice_items` — line items
- `expenses` — business expenses
- `businesses` — owner business settings + logo
- `team_members` — invited team members + permissions
- `time_entries` — clock in/out records
- `hours_log` — manually logged hours
- `mileage_logs` — mileage entries with CRA tiered rate calculations

## Key Business Logic
- **HST rate:** 13% (Ontario default)
- **Reports:** Based on invoices marked paid
- **Dashboard "This week's income":** Based on completed jobs (Mon–Sun)
- **Invoice numbering:** Auto-incremented INV-001, INV-002, etc.
- **Recurring jobs:** Weekly, biweekly, monthly — capped at 3 months out (with extend reminder)
- **Mileage:** CRA tiered rates applied automatically
- **Canadian context:** HST, ITC (input tax credits), CRA reporting
