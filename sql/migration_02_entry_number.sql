-- MIGRATION: run these against mis-gempundit.inventory_recon
-- (this is additive/altering — it does not touch your existing users or criteria rows
--  except where noted)

-- 1. criteria: add `location` (new dropdown source for Lot Entry / Entry-where-no-Pkt-No.)
--    category/packet_no stay in the table but are no longer used by the app.
ALTER TABLE `mis-gempundit.inventory_recon.criteria`
  ADD COLUMN IF NOT EXISTS location STRING;

-- 2. normal_entries: restructure around entry_number as the unique/checked value.
--    packet_no becomes free-text context, category becomes optional.
ALTER TABLE `mis-gempundit.inventory_recon.normal_entries`
  ADD COLUMN IF NOT EXISTS entry_number STRING;

ALTER TABLE `mis-gempundit.inventory_recon.normal_entries`
  ALTER COLUMN category DROP NOT NULL;

-- 3. lot_entries: add location, drop the category requirement.
ALTER TABLE `mis-gempundit.inventory_recon.lot_entries`
  ADD COLUMN IF NOT EXISTS location STRING;

ALTER TABLE `mis-gempundit.inventory_recon.lot_entries`
  ALTER COLUMN category DROP NOT NULL;

-- 4. New table: bom  (your "BOM_Helper" — Inv_ID + status, used for the
--    "Already Present in BOM" check, with an RTO exception).
CREATE TABLE IF NOT EXISTS `mis-gempundit.inventory_recon.bom` (
  inv_id STRING NOT NULL,
  status STRING
);

-- 5. New table: no_pkt_entries  ("Entry where no Pkt No." form's own database)
CREATE TABLE IF NOT EXISTS `mis-gempundit.inventory_recon.no_pkt_entries` (
  entry_id      STRING NOT NULL,   -- internal UUID
  entry_number  STRING NOT NULL,   -- the inventory number the person typed
  location      STRING NOT NULL,
  gemstone      STRING NOT NULL,
  submitted_by  STRING NOT NULL,
  submitted_at  TIMESTAMP NOT NULL,
  recon_month   DATE NOT NULL
)
PARTITION BY recon_month;

-- Fill in a location for each existing criteria row, e.g.:
-- UPDATE `mis-gempundit.inventory_recon.criteria` SET location = 'Rack A1' WHERE packet_no = 'PKT-001';
-- UPDATE `mis-gempundit.inventory_recon.criteria` SET location = 'Rack A2' WHERE packet_no = 'PKT-002';
-- The dropdown on Lot Entry / Entry-where-no-Pkt-No. reads DISTINCT location from this table,
-- so every row needs one filled in for it to show up as an option.
