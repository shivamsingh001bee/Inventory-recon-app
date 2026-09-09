-- NOTE: superseded by schema_final.sql for fresh installs (this file is kept for history/reference only).

-- MIGRATION 04: Monthly reconciliation reports
-- Compares normal_entries against the real inventory master
-- (mis-gempundit.IMS_New_Version.Final_inventory_master) and saves three
-- monthly snapshots of discrepancies.

-- 1. Run log — backs the role-based guard (members: once/month, admins: unlimited)
CREATE TABLE IF NOT EXISTS `mis-gempundit.inventory_recon.recon_runs` (
  run_id      STRING NOT NULL,
  recon_month DATE NOT NULL,
  run_by      STRING NOT NULL,
  run_role    STRING NOT NULL,   -- 'member' | 'admin', for the block message
  run_at      TIMESTAMP NOT NULL
);

-- 2. Case 1 — in normal_entries but NOT in the master (small, known schema)
CREATE TABLE IF NOT EXISTS `mis-gempundit.inventory_recon.recon_missing_from_master` (
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

-- 3. Case 2 — in the master (and not Out of Stock) but NOT in normal_entries
--    this month. Key fields pulled out for filtering/display; full_row keeps
--    every one of the master's 77 columns as JSON so nothing is lost.
CREATE TABLE IF NOT EXISTS `mis-gempundit.inventory_recon.recon_missing_from_entries` (
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

-- 4. Case 3 — Out of Stock in the master, but someone physically entered it
--    this month anyway. Also carries who found it, from normal_entries.
CREATE TABLE IF NOT EXISTS `mis-gempundit.inventory_recon.recon_out_of_stock_but_found` (
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
