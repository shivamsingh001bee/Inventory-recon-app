-- NOTE: superseded by schema_final.sql for fresh installs (this file is kept for history/reference only).

-- MIGRATION 03: Lot Entry redesign — matches the real sheet exactly
-- (Location, Gemstone, Lot No., No. of Pcs, Total Carat Ct, Comments — no
-- date field, no category). This supersedes lot_entries as created by
-- schema.sql or migration_02.
--
-- WARNING: this drops the existing lot_entries table and all its data.
-- Export/backup first if you need to keep anything in it.

DROP TABLE IF EXISTS `mis-gempundit.inventory_recon.lot_entries`;

CREATE TABLE `mis-gempundit.inventory_recon.lot_entries` (
  entry_id        STRING NOT NULL,   -- internal UUID
  lot_no          STRING NOT NULL,
  location        STRING NOT NULL,
  gemstone        STRING NOT NULL,
  no_of_pcs       INT64 NOT NULL,
  total_carat_ct  NUMERIC NOT NULL,
  comments        STRING,
  submitted_by    STRING NOT NULL,
  submitted_at    TIMESTAMP NOT NULL,
  recon_month     DATE NOT NULL
)
PARTITION BY recon_month;
