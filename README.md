# Reconciliation Register

Replaces the 13-sheet Google Sheets + IMPORTRANGE workflow with a single web
app backed by BigQuery, deployed on Vercel.

## What's built (Phase 1–3 of the plan)

- Google OAuth login, restricted to an allow-list stored in BigQuery (`users` table)
- Normal Entry form — Packet No. / Gemstone dropdowns sourced from `criteria`,
  with the two duplicate checks (in-batch + already-in-database) enforced server-side
- Lot Entry form — Lot No., Pieces, Carat Wt., Date, Comments, with a Lot No. duplicate check
- Live "Count" widget per member (replaces the sheet's `Count: 0` cell)
- Admin overview — per-member submission progress for the current month
- Anuj's dual-category case handled generically: any user with 2 entries in
  `users.categories` gets a category switcher on both forms; everyone else
  goes straight to their one category

**Not built yet** (next phases, per the architecture doc): user management
screen (adding/removing members from the UI — for now, edit the `users`
table directly in BigQuery), monthly consolidation/export view, `criteria`
bulk-upload tooling.

## 1. Set up BigQuery

1. Create (or pick) a GCP project and enable the BigQuery API.
2. Create a service account with the **BigQuery Data Editor** and
   **BigQuery Job User** roles, and download its JSON key.
3. Copy `.env.example` to `.env.local` and fill in `GCP_PROJECT_ID`,
   `BIGQUERY_DATASET`, and paste the full service account JSON as one line
   into `GCP_SERVICE_ACCOUNT_KEY`.
4. Create the dataset + tables:
   ```bash
   npm install
   npm run db:init
   ```
   (Equivalent SQL is in `sql/schema.sql` if you'd rather run it by hand in
   the BigQuery console.)
5. Insert your team into `users` — this is what controls both login access
   and which category(ies) each person sees. Example:
   ```sql
   INSERT INTO `your_project.inventory_recon.users`
     (user_id, name, role, categories, active, created_at)
   VALUES
     ('anuj@yourcompany.com', 'Anuj', 'member', ['under_2L','above_2L'], TRUE, CURRENT_TIMESTAMP()),
     ('you@yourcompany.com', 'Your Name', 'admin', ['under_2L','above_2L'], TRUE, CURRENT_TIMESTAMP());
   ```
6. Load `criteria` with your packet numbers / gemstones / category per row
   (this is what currently lives in your sheet's criteria tab). A CSV load
   job or the BigQuery console's "upload" UI both work fine for this.

## 2. Set up Google OAuth

1. In Google Cloud Console → APIs & Services → Credentials, create an
   **OAuth 2.0 Client ID** (type: Web application).
2. Authorized redirect URI for local dev:
   `http://localhost:3000/api/auth/callback/google`
   Add your Vercel production URL's equivalent once deployed.
3. Put the client ID/secret into `.env.local` as `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`.
4. Generate `NEXTAUTH_SECRET`: `openssl rand -base64 32`.

Note: sign-in is gated by the `users` table, not by a Google Workspace
domain restriction — anyone with a Google account can attempt sign-in, but
only emails present and `active = TRUE` in `users` are let through. Tell me
if you'd rather also lock it to your company's Workspace domain and I'll add
that.

## 3. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## 4. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add all the same env vars from `.env.local` into the Vercel project
   settings (Production + Preview).
4. Update `NEXTAUTH_URL` to your production URL, and add the matching
   redirect URI in Google Cloud Console.
5. Deploy.

## Project structure

```
app/
  login/                 Google sign-in
  dashboard/             member overview (live counts)
  dashboard/admin/       admin: per-member progress
  entry/normal/          Normal Entry form
  entry/lot/             Lot Entry form
  api/entries/normal/    validation + insert for Normal Entry
  api/entries/lot/       validation + insert for Lot Entry
  api/criteria/          dropdown data, filtered by category
  api/summary/           live counters
lib/
  auth.ts                NextAuth + BigQuery allow-list check
  bigquery.ts            BigQuery client + helpers
  types.ts               shared TS types
sql/schema.sql            DDL (reference copy of what scripts/init-bigquery.ts creates)
```
