# Helping Hands - Senior Home Assistance Platform

A subscription-based client portal + admin dashboard for a business that
sends crews to help elderly clients with yard work and household tasks.

This is an MVP: no payment processing, no real email/SMS delivery, single
business only. It's built to be handed off in sections for further
iteration - see [Project structure](#project-structure) below.

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19, JavaScript (no TypeScript)
- **Styling:** Tailwind CSS v4
- **Database:** SQLite via Prisma ORM (swap to Postgres for production - see below)
- **Auth:** Email/password with `bcryptjs` + encrypted cookie sessions via `iron-session` (no third-party auth provider)
- **File uploads:** Task/visit photos are saved to `public/uploads` on local disk

## Getting started

```bash
npm install
cp .env.example .env          # generates DATABASE_URL + SESSION_SECRET placeholders
# edit .env and set SESSION_SECRET to a random 32+ character string:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm run db:migrate            # creates prisma/dev.db and applies the schema
npm run db:seed               # loads demo pricing config + 4 sample clients
npm run dev                   # http://localhost:3000
```

### Demo accounts

All seeded accounts use the password `password123`.

| Role           | Email                          | Notes                                   |
| -------------- | ------------------------------- | ---------------------------------------- |
| Admin          | admin@helpinghands.example      | Full admin dashboard                     |
| Client         | eleanor@example.com             | Has a linked family member (Mark)        |
| Family member  | mark@example.com                | Linked to Eleanor's account              |
| Client         | walter@example.com              | 2-person crew plan, one scheduled visit  |
| Client         | dorothy@example.com             | Open urgent request                      |
| Client         | sam@example.com                 | Out of flex visits (billable task)       |

Re-run `npm run db:seed` any time to reset to this state (it wipes and
reloads all tables).

## Project structure

```
app/
  login/, register/, logout/, invite/[token]/   Auth + family invite acceptance
  client/                                        Client portal (role: CLIENT | FAMILY)
    page.js            Dashboard: plan, next visit, recent tasks
    tasks/              Task list + create/edit form with live price preview
    visits/              Visit history
    family/               Family member invite management
  admin/                                          Admin dashboard (role: ADMIN)
    page.js             Overview: clients + requests sorted by urgency
    requests/            Incoming task requests, schedule a crew
    visits/               All visits, mark complete (with photos/notes)
    clients/               Client management (add/edit/deactivate, change plan)
    pricing/                Edit subscription tiers + on-demand pricing

lib/
  pricing.js / pricingCalc.js   Pricing config + the price-quote calculation
                                  (pricingCalc.js has no server-only imports so
                                  it can also run in the browser for live previews)
  session.js                    Auth session helpers (iron-session)
  auth.js                       Password hashing
  uploads.js                    Local photo upload handling
  notifications.js              In-app notification helpers
  constants.js                  Role/urgency/status string enums (SQLite has no
                                  native enum type, so these are enforced here)

prisma/
  schema.prisma    Data models (see spec's suggested models, kept close to it)
  seed.js          Seed script - see "Demo accounts" above

components/
  ui/                Small shared primitives (Button, Card, form fields)
  TaskForm.js         The task request/edit form with live price preview
  UrgencyBadge.js, StatusBadge.js, NotificationBell.js, LogoutButton.js
```

Each Server Action lives in an `actions.js` file next to the page(s) that
use it, so a section (e.g. "admin/pricing") can be handed off and understood
without hunting through a global `api/` folder.

## Design notes

- The client portal (`app/client/**`) uses larger text, higher contrast, and
  fewer clicks - see the `.senior-portal` class in `app/globals.css`.
- The admin dashboard (`app/admin/**`) is deliberately denser - tables, small
  inline forms - since it's used by the business owner, not clients.
- Both are responsive; the client portal in particular is built mobile-first
  since family members are likely to use it on their phones.

## Pricing configuration

Nothing is hardcoded. `SubscriptionTier` and `UrgencyPricing` are database
tables, editable at `/admin/pricing`. The actual quote math lives in
`lib/pricingCalc.js` (`quoteForUrgency`) and is used both server-side (when a
request is confirmed) and client-side (for the live preview as a client
picks an urgency level), so the number shown never contradicts what gets
billed. The "2 free flex visits/month" rule is intentionally hardcoded in
that function (not a config value) per the spec - flex visit count per plan
*is* configurable via `SubscriptionTier.flexVisitsPerMonth`.

## Future work (explicitly out of scope for this MVP)

- **Payments:** No payment processing is implemented. `Task.billable` /
  `Task.priceQuote` record what *should* be charged; wiring that up to
  Stripe (e.g. invoicing non-subscriber fees, upgrading/downgrading plans)
  is the natural next step.
- **Real email/SMS:** Notifications are in-app only (`Notification` model).
  Family invites currently show a shareable link on-screen instead of
  emailing it. Swap in an email provider (e.g. Resend, Postmark) in
  `lib/notifications.js` and `app/client/family/actions.js`.
- **Photo storage:** Uploaded photos are saved to `public/uploads` on local
  disk (`lib/uploads.js`). For a real deployment, swap this for object
  storage (S3, R2, etc.) so uploads survive redeploys/scale past one server.
- **Postgres:** Switch `datasource.provider` in `prisma/schema.prisma` from
  `sqlite` to `postgresql`, set `DATABASE_URL` accordingly, and re-run
  `prisma migrate dev`. Note SQLite has no native enum type, so the schema
  currently uses plain `String` fields with allowed values documented in
  `lib/constants.js` - Postgres could adopt native enums if you want stricter
  DB-level validation, but the current approach also works fine there.
- **Multi-business/franchise support:** Not implemented - all data is scoped
  to a single business.
