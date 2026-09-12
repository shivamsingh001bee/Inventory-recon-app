-- Consolidated schema — replaces schema.sql + migrations 02/03/04.
-- Run this fresh after deleting the old inventory_recon dataset.
--
-- Location: asia-south2 — MUST match Final_inventory_master's dataset
-- region (IMS_New_Version), since Reports queries both together in one job.

CREATE SCHEMA IF NOT EXISTS `mis-gempundit.inventory_recon`
OPTIONS (location = 'asia-south2');

-- ============================================
-- 1. users — controls login access + role
-- ============================================
CREATE TABLE `mis-gempundit.inventory_recon.users` (
  user_id     STRING NOT NULL,   -- Google account email, primary key
  name        STRING NOT NULL,
  role        STRING NOT NULL,   -- 'member' | 'admin'
  active      BOOL NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
);

-- ============================================
-- 2. criteria — feeds Gemstone + Location dropdowns
-- ============================================
CREATE TABLE `mis-gempundit.inventory_recon.criteria` (
  packet_no   STRING,
  gemstone    STRING NOT NULL,
  location    STRING,
  category    STRING,           -- legacy, unused
  is_active   BOOL NOT NULL DEFAULT TRUE
);

-- ============================================
-- 3. normal_entries — Normal Entry submissions
-- ============================================
CREATE TABLE `mis-gempundit.inventory_recon.normal_entries` (
  entry_id      STRING NOT NULL,   -- internal UUID
  entry_number  STRING NOT NULL,   -- the person's Entry No. (checked field)
  packet_no     STRING NOT NULL,
  gemstone      STRING NOT NULL,
  submitted_by  STRING NOT NULL,
  submitted_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  recon_month   DATE NOT NULL
)
PARTITION BY recon_month;

-- ============================================
-- 4. lot_entries — Lot Entry submissions
-- ============================================
CREATE TABLE `mis-gempundit.inventory_recon.lot_entries` (
  entry_id        STRING NOT NULL,
  lot_no          STRING NOT NULL,
  location        STRING NOT NULL,
  gemstone        STRING NOT NULL,
  no_of_pcs       INT64 NOT NULL,
  total_carat_ct  NUMERIC NOT NULL,
  comments        STRING,
  submitted_by    STRING NOT NULL,
  submitted_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  recon_month     DATE NOT NULL
)
PARTITION BY recon_month;

-- ============================================
-- 5. no_pkt_entries — Entry where no Pkt No. submissions
-- ============================================
CREATE TABLE `mis-gempundit.inventory_recon.no_pkt_entries` (
  entry_id      STRING NOT NULL,
  entry_number  STRING NOT NULL,
  location      STRING NOT NULL,
  gemstone      STRING NOT NULL,
  submitted_by  STRING NOT NULL,
  submitted_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  recon_month   DATE NOT NULL
)
PARTITION BY recon_month;

-- ============================================
-- 6. recon_runs — log backing the Reports run-guard
-- ============================================
CREATE TABLE `mis-gempundit.inventory_recon.recon_runs` (
  run_id      STRING NOT NULL,
  recon_month DATE NOT NULL,
  run_by      STRING NOT NULL,
  run_role    STRING NOT NULL,   -- 'member' | 'admin'
  run_at      TIMESTAMP NOT NULL
);

-- ============================================
-- 7. recon_missing_from_master — Case 1
-- ============================================
CREATE TABLE `mis-gempundit.inventory_recon.recon_missing_from_master` (
  run_id        STRING NOT NULL,
  recon_month   DATE NOT NULL,
  run_at        TIMESTAMP NOT NULL,
  run_by        STRING NOT NULL,
  entry_number  STRING NOT NULL,
  packet_no     STRING,
  gemstone      STRING,
  submitted_by  STRING,
  submitted_at  TIMESTAMP
)
PARTITION BY recon_month;

-- ============================================
-- 8. recon_missing_from_entries — Case 2
-- ============================================
CREATE TABLE `mis-gempundit.inventory_recon.recon_missing_from_entries` (
  run_id      STRING NOT NULL,
  recon_month DATE NOT NULL,
  run_at      TIMESTAMP NOT NULL,
  run_by      STRING NOT NULL,
  inv_id      STRING NOT NULL,
  status      STRING,
  location    STRING,
  gemstone    STRING,
  price       NUMERIC,
  full_row    STRING NOT NULL
)
PARTITION BY recon_month;

-- ============================================
-- 9. recon_out_of_stock_but_found — Case 3
-- ============================================
CREATE TABLE `mis-gempundit.inventory_recon.recon_out_of_stock_but_found` (
  run_id            STRING NOT NULL,
  recon_month       DATE NOT NULL,
  run_at            TIMESTAMP NOT NULL,
  run_by            STRING NOT NULL,
  inv_id            STRING NOT NULL,
  status            STRING,
  location          STRING,
  gemstone          STRING,
  price             NUMERIC,
  full_row          STRING NOT NULL,
  found_packet_no   STRING,
  found_by          STRING,
  found_at          TIMESTAMP
)
PARTITION BY recon_month;

-- No `bom` table here — the app reads your real BOM table directly, cross-
-- dataset (mis-gempundit.IMS_New_Version.BOM). Nothing to create for it.

-- Seed your team after this runs:
-- INSERT INTO `mis-gempundit.inventory_recon.users`
--   (user_id, name, role, active, created_at)
-- VALUES
--   ('anuj@gempundit.com', 'Anuj', 'member', TRUE, CURRENT_TIMESTAMP()),
--   ('shivam@gempundit.com', 'Shivam', 'admin', TRUE, CURRENT_TIMESTAMP());
