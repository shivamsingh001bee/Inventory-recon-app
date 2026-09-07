# Reconciliation Register

Replaces the 13-sheet Google Sheets + IMPORTRANGE workflow with a single web
app backed by BigQuery, deployed on Vercel.

## What's built

- Google OAuth login, restricted to an allow-list stored in BigQuery (`users` table)
- **Normal Entry** — Packet No. is a free-text field (context only), Gemstone
  is a dropdown from `criteria`, and you add as many Entry Numbers as you
  like in one batch. **Check & Submit** re-runs the full validation chain
  (ported directly from your sheet formula) and only saves if every row
  passes:
  - blank check
  - same-as-packet-number check
  - length > 6 digits
  - 3-digit codes only allowed if they start with `800` or `94`
  - duplicate within the batch
  - already present in `bom` (unless its status is `RTO`)
  - already saved in `normal_entries` for this month
  - prefix must match the Packet No.
- **Lot Entry** — Location + Gemstone dropdowns (from `criteria`), one
  submission at a time, with a Lot No. duplicate check against the current
  month's `lot_entries`.
- **Entry where no Pkt No.** — same batch pattern as Normal Entry, but with
  Location + Gemstone dropdowns instead of a packet number. Checks for
  duplicates within the batch, whether the number was already entered under
  a Packet No. (and tells you which one), and whether it's already saved in
  this form's own table.
- Live per-member counters (Normal / Lot / No Pkt No.) replacing the sheet's
  `Count: 0` cell
- Admin overview — per-member submission progress for the current month

**Category (under ₹2L / above ₹2L) has been removed.** Every member now has
a single, unified workflow — no switcher, no filtering by category anywhere
in the app. (The `category` column is still present in `criteria` and the
entry tables for backward compatibility, but nothing reads or writes it.)

**Not built yet:** CSV bulk upload + downloadable template (next up, once
you're happy with the Entry Number flow), user management screen (for now,
edit the `users` table directly), monthly consolidation/export view.

## 1. Set up BigQuery

**If this is a fresh install:** run `sql/schema.sql` (or `npm run db:init`,
see below).

**If you already have tables from an earlier version of this app:** run
`sql/migration_02_entry_number.sql` instead — it adds the new columns/tables
without touching your existing `users` or `criteria` rows.

New tables this version adds:
- `bom` — your "BOM_Helper". Columns: `inv_id`, `status`. Load it with
  whatever inventory IDs are currently on your Bill of Materials; anything
  with `status = 'RTO'` is let through even if it matches.
- `no_pkt_entries` — the database this form's entries land in.

New columns:
- `criteria.location` — fill one in for every existing row; the Location
  dropdown reads `DISTINCT location FROM criteria`.
- `normal_entries.entry_number` — the actual Entry No. people type. This is
  now what gets duplicate/format-checked, not `packet_no`.

```bash
npm install
npm run db:init   # creates any missing tables/dataset from your .env
```

Then insert your team into `users` (this still controls login access):
```sql
INSERT INTO `your_project.inventory_recon.users`
  (user_id, name, role, active, created_at)
VALUES
  ('anuj@yourcompany.com', 'Anuj', 'member', TRUE, CURRENT_TIMESTAMP()),
  ('you@yourcompany.com', 'Your Name', 'admin', TRUE, CURRENT_TIMESTAMP());
```

## 2. Set up Google OAuth

1. Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID
   (type: Web application).
2. Authorized redirect URIs — add both:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://<your-vercel-domain>/api/auth/callback/google` (production —
     must match `NEXTAUTH_URL` exactly, protocol included)
3. Put the client ID/secret into `.env.local` as `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`.
4. `NEXTAUTH_SECRET`: generate with `openssl rand -base64 32`.

## 3. Run locally

```bash
npm install
npm run dev
```

## 4. Deploy to Vercel

1. Push to GitHub, import into Vercel.
2. Add every variable from `.env.example` into Vercel Project Settings
   (Production + Preview) — `.env.local` is never uploaded, so this step is
   required even if it already works locally.
3. `NEXTAUTH_URL` must be the full production URL with `https://`, no
   trailing slash — Vercel's bare `VERCEL_URL` (no protocol) will cause a
   build-time "Invalid URL" error if `NEXTAUTH_URL` isn't set explicitly.
4. Redeploy after adding/changing env vars — they don't apply retroactively.

## Project structure

```
app/
  login/                    Google sign-in
  dashboard/                member overview (live counts)
  dashboard/admin/          admin: per-member progress
  entry/normal/             Normal Entry (Packet No. + Gemstone + Entry No. batch)
  entry/lot/                Lot Entry (Location + Gemstone + Lot No.)
  entry/no-pkt/             Entry where no Pkt No. (Location + Gemstone + Entry No. batch)
  api/entries/normal/       submit — re-validates + all-or-nothing insert
  api/entries/normal/check/ validate only, no insert
  api/entries/lot/          submit + Lot No. duplicate check
  api/entries/no-pkt/       submit — re-validates + all-or-nothing insert
  api/entries/no-pkt/check/ validate only, no insert
  api/criteria/             distinct gemstone + location lists
  api/summary/              live counters
lib/
  auth.ts                   NextAuth + BigQuery allow-list check
  bigquery.ts                BigQuery client + helpers
  validation.ts              the ported sheet-formula validation logic
  types.ts                   shared TS types
sql/
  schema.sql                 full DDL for a fresh install
  migration_02_entry_number.sql   migration for existing installs
```
