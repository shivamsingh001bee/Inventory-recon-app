-- Full schema for a fresh install. If you already have tables from an
-- earlier version of this app, use sql/migration_02_entry_number.sql instead.

CREATE SCHEMA IF NOT EXISTS `your_project.inventory_recon`
OPTIONS (location = 'US');

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
  entry_id      STRING NOT NULL,
  lot_no        STRING NOT NULL,
  no_of_pcs     INT64 NOT NULL,
  carat_wt      NUMERIC NOT NULL,
  entry_date    DATE NOT NULL,
  comments      STRING,
  location      STRING NOT NULL,
  gemstone      STRING NOT NULL,
  submitted_by  STRING NOT NULL,
  submitted_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  recon_month   DATE NOT NULL
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

-- 6. bom (your "BOM_Helper") — used for the "Already Present in BOM" check.
--    status = 'RTO' is the one exception that lets an entry through anyway.
CREATE TABLE IF NOT EXISTS `your_project.inventory_recon.bom` (
  inv_id  STRING NOT NULL,
  status  STRING
);

-- Seed example:
-- INSERT INTO `your_project.inventory_recon.users` (user_id, name, role, active, created_at)
-- VALUES
--   ('anuj@yourcompany.com', 'Anuj', 'member', TRUE, CURRENT_TIMESTAMP()),
--   ('admin@yourcompany.com', 'Admin', 'admin', TRUE, CURRENT_TIMESTAMP());
