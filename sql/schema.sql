-- NOTE: superseded by schema_final.sql for fresh installs (this file is kept for history/reference only).

-- Full schema for a fresh install. If you already have tables from an
-- earlier version of this app, use sql/migration_02_entry_number.sql instead.
--
-- Location matters: this MUST match the region of Final_inventory_master
-- (IMS_New_Version dataset) since Reports queries both together. Check your
-- master dataset's region in the BigQuery console before running this.

CREATE SCHEMA IF NOT EXISTS `your_project.inventory_recon`
OPTIONS (location = 'asia-south2');

-- 1. Team members. `role` is 'member' | 'admin'.
CREATE TABLE IF NOT EXISTS `your_project.inventory_recon.users` (
  user_id     STRING NOT NULL,
  name        STRING NOT NULL,
  role        STRING NOT NULL,
  active      BOOL NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
);

-- 2. Reference data feeding the Gemstone + Location dropdowns.
CREATE TABLE IF NOT EXISTS `your_project.inventory_recon.criteria` (
  packet_no   STRING,
  gemstone    STRING NOT NULL,
  location    STRING,
  category    STRING,          -- legacy, unused by the app
  is_active   BOOL NOT NULL DEFAULT TRUE
);

-- 3. Normal Entry submissions. entry_number is the actual inventory ID that
--    gets duplicate/format-checked; packet_no is context used only for the
--    prefix-match rule.
CREATE TABLE IF NOT EXISTS `your_project.inventory_recon.normal_entries` (
  entry_id      STRING NOT NULL,   -- internal UUID
  entry_number  STRING NOT NULL,   -- the person's Entry No.
  packet_no     STRING NOT NULL,
  gemstone      STRING NOT NULL,
  submitted_by  STRING NOT NULL,
  submitted_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  recon_month   DATE NOT NULL
)
PARTITION BY recon_month;

-- 4. Lot Entry submissions.
CREATE TABLE IF NOT EXISTS `your_project.inventory_recon.lot_entries` (
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

-- 5. "Entry where no Pkt No." submissions — its own database, separate from
--    normal_entries.
CREATE TABLE IF NOT EXISTS `your_project.inventory_recon.no_pkt_entries` (
  entry_id      STRING NOT NULL,
  entry_number  STRING NOT NULL,
  location      STRING NOT NULL,
  gemstone      STRING NOT NULL,
  submitted_by  STRING NOT NULL,
  submitted_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  recon_month   DATE NOT NULL
)
PARTITION BY recon_month;

-- 6. BOM check: this app does NOT own a `bom` table. It reads your existing
--    BOM table directly, in a different dataset (cross-dataset query, same
--    project): e.g. mis-gempundit.IMS_New_Version.BOM (columns: Inv_ID, RTO_Mark).
--    Point BOM_TABLE_ID at it in your env vars — nothing to create here.

-- Seed example:
-- INSERT INTO `your_project.inventory_recon.users` (user_id, name, role, active, created_at)
-- VALUES
--   ('anuj@yourcompany.com', 'Anuj', 'member', TRUE, CURRENT_TIMESTAMP()),
--   ('admin@yourcompany.com', 'Admin', 'admin', TRUE, CURRENT_TIMESTAMP());
