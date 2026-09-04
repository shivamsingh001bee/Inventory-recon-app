-- Run these once against your GCP project to set up the dataset.
-- Replace `your_project` with your actual GCP project id.

CREATE SCHEMA IF NOT EXISTS `your_project.inventory_recon`
OPTIONS (location = 'US');

-- 1. Team members + who can see which category(ies).
-- Anuj is the only row (today) with two entries in `categories`.
CREATE TABLE IF NOT EXISTS `your_project.inventory_recon.users` (
  user_id     STRING NOT NULL,   -- Google account email, primary key
  name        STRING NOT NULL,
  role        STRING NOT NULL,   -- 'member' | 'admin'
  categories  ARRAY<STRING>,     -- 'under_2L' | 'above_2L'
  active      BOOL NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
);

-- 2. Reference/master data that feeds the Packet No. + Gemstone dropdowns.
CREATE TABLE IF NOT EXISTS `your_project.inventory_recon.criteria` (
  packet_no   STRING NOT NULL,
  gemstone    STRING NOT NULL,
  category    STRING NOT NULL,   -- 'under_2L' | 'above_2L'
  is_active   BOOL NOT NULL DEFAULT TRUE
);

-- 3. Normal Entry submissions (this is the "database/Table_name" duplicate-checked against).
CREATE TABLE IF NOT EXISTS `your_project.inventory_recon.normal_entries` (
  entry_id      STRING NOT NULL,
  packet_no     STRING NOT NULL,
  gemstone      STRING NOT NULL,
  category      STRING NOT NULL,
  submitted_by  STRING NOT NULL,   -- FK -> users.user_id
  submitted_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  recon_month   DATE NOT NULL      -- first-of-month, e.g. 2026-09-01
)
PARTITION BY recon_month;

-- 4. Lot Entry submissions — different shape, batch-level, not packet-level.
CREATE TABLE IF NOT EXISTS `your_project.inventory_recon.lot_entries` (
  entry_id      STRING NOT NULL,
  lot_no        STRING NOT NULL,
  no_of_pcs     INT64 NOT NULL,
  carat_wt      NUMERIC NOT NULL,
  entry_date    DATE NOT NULL,
  comments      STRING,
  category      STRING NOT NULL,
  submitted_by  STRING NOT NULL,
  submitted_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  recon_month   DATE NOT NULL
)
PARTITION BY recon_month;

-- Seed example (edit/remove before running for real):
-- INSERT INTO `your_project.inventory_recon.users` (user_id, name, role, categories, active)
-- VALUES
--   ('anuj@yourcompany.com', 'Anuj', 'member', ['under_2L', 'above_2L'], TRUE),
--   ('admin@yourcompany.com', 'Admin', 'admin', ['under_2L', 'above_2L'], TRUE);
