-- MIGRATION 05: Reconciliation logic as BigQuery views.
-- Run this in BigQuery console. These views always reflect the CURRENT
-- calendar month — no parameters, since DATE_TRUNC(CURRENT_DATE(), MONTH)
-- computes "this month" at query time.
--
-- Why views: the comparison logic now lives here, editable directly in
-- BigQuery without a code deploy. The app's Run Now button just does
-- DELETE + INSERT INTO ... SELECT * FROM these views into the recon_*
-- snapshot tables (see lib/recon.ts).

CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_recon_missing_from_master` AS
SELECT
  ne.entry_number,
  ne.packet_no,
  ne.gemstone,
  ne.submitted_by,
  ne.submitted_at
FROM `mis-gempundit.inventory_recon.normal_entries` ne
WHERE ne.recon_month = DATE_TRUNC(CURRENT_DATE(), MONTH)
  AND NOT EXISTS (
    SELECT 1 FROM `mis-gempundit.IMS_New_Version.Final_inventory_master` fm
    WHERE CAST(fm.Int_mas_Inventory_ID AS STRING) = ne.entry_number
  );

CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_recon_missing_from_entries` AS
SELECT
  CAST(fm.Int_mas_Inventory_ID AS STRING) AS inv_id,
  fm.Final_Inventory_Status AS status,
  fm.Final_Live_Location AS location,
  fm.Final_Gemstone2 AS gemstone,
  SAFE_CAST(fm.Final_formula_Based_Price AS NUMERIC) AS price,
  TO_JSON_STRING(fm) AS full_row
FROM `mis-gempundit.IMS_New_Version.Final_inventory_master` fm
WHERE fm.Final_Inventory_Status != 'Out of Stock'
  AND NOT EXISTS (
    SELECT 1 FROM `mis-gempundit.inventory_recon.normal_entries` ne
    WHERE ne.recon_month = DATE_TRUNC(CURRENT_DATE(), MONTH)
      AND ne.entry_number = CAST(fm.Int_mas_Inventory_ID AS STRING)
  );

CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_recon_out_of_stock_but_found` AS
SELECT
  CAST(fm.Int_mas_Inventory_ID AS STRING) AS inv_id,
  fm.Final_Inventory_Status AS status,
  fm.Final_Live_Location AS location,
  fm.Final_Gemstone2 AS gemstone,
  SAFE_CAST(fm.Final_formula_Based_Price AS NUMERIC) AS price,
  TO_JSON_STRING(fm) AS full_row,
  ne.packet_no AS found_packet_no,
  ne.submitted_by AS found_by,
  ne.submitted_at AS found_at
FROM `mis-gempundit.IMS_New_Version.Final_inventory_master` fm
JOIN `mis-gempundit.inventory_recon.normal_entries` ne
  ON ne.entry_number = CAST(fm.Int_mas_Inventory_ID AS STRING)
  AND ne.recon_month = DATE_TRUNC(CURRENT_DATE(), MONTH)
WHERE fm.Final_Inventory_Status = 'Out of Stock';

-- To change what counts as a discrepancy in the future (e.g. add another
-- filter), just CREATE OR REPLACE the relevant view above with the new
-- logic — no app code change or redeploy needed. The app always reads
-- whatever the view currently returns at the moment Run Now is clicked.
