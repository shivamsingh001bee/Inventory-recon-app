-- MIGRATION 07a: Investigations system — config table, run log, and views.
-- Run this BEFORE migration_07b (which derives the tables from these views).

-- ============================================
-- Config table — drives what the app shows and runs.
-- Adding a new investigation later = one INSERT here + its view + its
-- table (via the CTAS pattern in 07b). No app code change.
-- ============================================
CREATE TABLE IF NOT EXISTS `mis-gempundit.inventory_recon.investigations` (
  id            STRING NOT NULL,   -- e.g. '1_1', '4_4', 'extra_1'
  display_name  STRING NOT NULL,   -- e.g. 'Investigation #1.1'
  view_name     STRING NOT NULL,   -- e.g. 'v_investigation_1_1'
  table_name    STRING NOT NULL,   -- e.g. 'investigation_1_1'
  group_number  STRING NOT NULL,   -- e.g. '1', '4', '5', '6', 'extra' — for sidebar grouping
  admin_only    BOOL NOT NULL DEFAULT FALSE,
  is_active     BOOL NOT NULL DEFAULT TRUE,  -- included in Run Now + shown as a tab
  sort_order    INT64 NOT NULL
);

-- ============================================
-- Run log — backs the run-guard (member: once/week, admin: unlimited)
-- ============================================
CREATE TABLE IF NOT EXISTS `mis-gempundit.inventory_recon.investigation_runs` (
  run_id      STRING NOT NULL,
  recon_week  DATE NOT NULL,   -- Monday of the week this run represents
  run_by      STRING NOT NULL,
  run_role    STRING NOT NULL,
  run_at      TIMESTAMP NOT NULL
);

-- ============================================
-- Views — one per investigation. Each is exactly the logic as given,
-- just namespaced under our v_investigation_X_Y convention and moved
-- into inventory_recon (views can reference other datasets/projects fine).
-- ============================================

CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_investigation_1_1` AS
WITH numeric_ids AS (
  SELECT CAST(Invoice_ID AS INT64) AS Invoice_ID
  FROM `mis-gempundit.IMS_New_Version.Invoice_FR`
  WHERE REGEXP_CONTAINS(Invoice_ID, r'^\d{1,5}$')

  UNION DISTINCT

  SELECT CAST(Invoice_ID AS INT64) AS Invoice_ID
  FROM `mis-gempundit.IMS_New_Version.Invoice_Credit_by_Account_Team`
  WHERE REGEXP_CONTAINS(Invoice_ID, r'^\d{1,5}$')
)
SELECT
  num AS missing_number
FROM UNNEST(
  GENERATE_ARRAY(
    4710,
    (SELECT MAX(Invoice_ID) FROM numeric_ids)
  )
) AS num
LEFT JOIN numeric_ids AS existing
ON num = existing.Invoice_ID
WHERE existing.Invoice_ID IS NULL;

CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_investigation_1_2` AS
WITH numeric_ids AS (
  SELECT CAST(Invoice_ID AS INT64) AS Invoice_ID
  FROM `mis-gempundit.IMS_New_Version.Invoice_FR`
  WHERE REGEXP_CONTAINS(Invoice_ID, r'^\d{1,5}$')
  AND Invoice_ID NOT IN ('0001', '63')
)
SELECT
  num AS missing_number
FROM UNNEST(
  GENERATE_ARRAY(
    (SELECT MIN(Invoice_ID) FROM numeric_ids),
    4710
  )
) AS num
LEFT JOIN numeric_ids AS n
  ON num = n.Invoice_ID
WHERE n.Invoice_ID IS NULL;

CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_investigation_2` AS
SELECT
  a.Invoice_ID,
  a.Number_of_Lot_Items AS Number_of_Lots_by_Account,
  fr.Line_Items_In_Invoice AS Number_of_Lots_by_Inventory
FROM `mis-gempundit.IMS_New_Version.Invoice_by_Account_Team` a
JOIN `mis-gempundit.IMS_New_Version.Invoice_FR` fr
  ON a.Invoice_ID = fr.Invoice_ID
WHERE REGEXP_CONTAINS(a.Invoice_ID, r'^\d+$')
  AND CAST(a.Invoice_ID AS INT64) > 4710
  AND a.Number_of_Lot_Items != fr.Line_Items_In_Invoice;

CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_investigation_3` AS
SELECT
  a.Invoice_ID,
  a.Total_Carat_weight AS Weight_by_Account,
  i.Items_Weight AS Weight_by_IMS
FROM `mis-gempundit.IMS_New_Version.Invoice_by_Account_Team` a
JOIN (
  SELECT
    Invoice_ID,
    SUM(Carat_Weight) AS Items_Weight
  FROM `mis-gempundit.IMS_New_Version.Invoice_Items`
  GROUP BY Invoice_ID
) i
  ON a.Invoice_ID = i.Invoice_ID
WHERE ROUND(a.Total_Carat_weight,2) != ROUND(i.Items_Weight,2);

CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_investigation_4_1` AS
WITH OutOfStock_NotInNonRTO AS (
  SELECT CAST(Int_mas_Inventory_ID AS STRING) AS Inv_ID
  FROM `mis-gempundit.IMS_New_Version.Final_Inventory_Master`
  WHERE Final_Inventory_Status = "Out of Stock"
  AND Final_Live_Location != 'Return to Vendor'
  AND In_out_Invoice_Number IS NULL
  EXCEPT DISTINCT
  (
    SELECT Inv_ID
    FROM `mis-gempundit.IMS_New_Version.BOM`
    WHERE RTO_Mark IS NULL
    UNION ALL
    SELECT Inv_ID
    FROM `mis-gempundit.IMS_New_Version.BOM_Prior_Date`
    WHERE RTO_Mark IS NULL
  )
  EXCEPT DISTINCT
  (SELECT CAST(Int_mas_Inventory_ID as STRING) as Inv_ID
    FROM `mis-gempundit.IMS_New_Version.Final_Inventory_Master` AS fin
    JOIN `mis-gempundit.mtd_orders.sales_flat_order` AS sfo
    ON fin.In_out_Order_Number = sfo.increment_id
    WHERE DATE(sfo.created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    AND sfo.status IN('forwarded_to_mailroom','processing','processing_forwarded_awaiting_ap','processing_jewellery_pv_sent','processing_making','processing_making_cad','processing_making_sent','processing_pending_approval_init','processing_pooja_complete','processing_pooja_sent','processing_problem_approved','processing_problem_check_initiat','processing_problem_procurement','processing_problem_procurement_b','processing_problem_sales','processing_qa_pass_jewelry','processing_ready_approval_initia','processing_ready_payment_pending','processing_ready_pending_payment','processing_sent_lab','ring_sizer_awaiting_update','ring_sizer_sent','submitted_to_vendor','processing_problem_sales_head','processing_qa_pass_normal')
  )
)
SELECT fim.In_out_Order_Number,
       fim.Int_mas_Inventory_ID,
       fim.Ex_Sku,
       fim.Final_Inventory_Status,
       fim.Final_Price_Per_Carat,
       fim.Final_Carat_Weight,
       fim.Final_Gemstone2
FROM `mis-gempundit.IMS_New_Version.Final_Inventory_Master` fim
JOIN OutOfStock_NotInNonRTO filtered
  ON CAST(fim.Int_mas_Inventory_ID AS STRING) = filtered.Inv_ID
WHERE LENGTH(fim.In_out_Order_Number)<=11
AND fim.In_out_Order_Number != '1';

CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_investigation_4_2` AS
WITH Credit AS (
  SELECT
    cm.order_increment_id AS Order_ID,
    BOM.Inv_ID
  FROM `mis-gempundit.mtd_orders.sales_flat_creditmemo_grid` cm
  JOIN (SELECT Order_ID, Inv_ID FROM `mis-gempundit.IMS_New_Version.BOM` WHERE REGEXP_CONTAINS(Inv_ID, r'^\d+$')) AS BOM
  ON cm.order_increment_id = BOM.Order_ID
  EXCEPT DISTINCT
  (SELECT Order_ID, Inv_ID
  FROM `mis-gempundit.IMS_New_Version.BOM`
  WHERE RTO_Mark IS NULL
  UNION ALL
  SELECT Order_ID, Inv_ID
  FROM `mis-gempundit.IMS_New_Version.BOM_Prior_Date`
  WHERE RTO_Mark IS NULL)
)
SELECT
  C.Order_ID,
  C.Inv_ID,
  IMS.Final_Carat_Weight AS Carat_Weight,
  IMS.Price_base_on_Rules_percent AS Price_Per_Carat,
  IMS.Final_Gemstone2 AS Gemstone2
FROM Credit C
LEFT JOIN `mis-gempundit.IMS_New_Version.Final_Inventory_Master` IMS
ON C.Inv_ID = CAST(IMS.Int_mas_Inventory_ID AS STRING);

CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_investigation_4_3` AS
SELECT
  invoice.order_increment_id AS Order_ID,
  BOM.Inv_ID
FROM `mis-gempundit.mtd_orders.sales_flat_invoice_grid` invoice
JOIN (
  SELECT Order_ID, Inv_ID FROM `mis-gempundit.IMS_New_Version.BOM` WHERE REGEXP_CONTAINS(Inv_ID, r'^\d+$')
  UNION ALL
  SELECT Order_ID, Inv_ID FROM `mis-gempundit.IMS_New_Version.BOM_Prior_Date` WHERE REGEXP_CONTAINS(Inv_ID, r'^\d+$')
) AS BOM
ON invoice.order_increment_id = BOM.Order_ID
WHERE invoice.state = 3
EXCEPT DISTINCT
(SELECT Order_ID, Inv_ID
FROM `mis-gempundit.IMS_New_Version.BOM`
WHERE RTO_Mark IS NOT NULL
UNION ALL
SELECT Order_ID, Inv_ID
FROM `mis-gempundit.IMS_New_Version.BOM_Prior_Date`
WHERE RTO_Mark IS NOT NULL);

CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_investigation_4_4` AS
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

CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_investigation_5_1` AS
WITH Bom_No_RTO AS (
  SELECT CAST(Invoice_ID AS STRING) AS Invoice_ID, Order_ID, Inv_ID, CAST(Item_Id AS STRING) AS Item_Id
  FROM `mis-gempundit.IMS_New_Version.BOM`
  WHERE RTO_Mark IS NULL
    AND Item_Id IS NOT NULL
    AND REGEXP_CONTAINS(Inv_ID, r'^\d+$')
  UNION ALL
  SELECT CAST(Invoice_ID AS STRING) AS Invoice_ID, Order_ID, Inv_ID, CAST(Item_Id AS STRING) AS Item_Id
  FROM `mis-gempundit.IMS_New_Version.BOM_Prior_Date`
  WHERE RTO_Mark IS NULL
    AND Item_Id IS NOT NULL
    AND REGEXP_CONTAINS(Inv_ID, r'^\d+$')
)
SELECT
  b.Invoice_ID,
  b.Order_ID,
  b.Item_Id,
  fim.Int_mas_Inventory_ID,
  fim.Ex_Sku,
  fim.Final_Inventory_Status,
  fim.Final_Carat_Weight,
  fim.Final_Price_Per_Carat,
  fim.Final_Gemstone2
FROM `mis-gempundit.IMS_New_Version.Final_Inventory_Master` AS fim
JOIN Bom_No_RTO AS b
  ON CAST(fim.Int_mas_Inventory_ID AS STRING) = b.Inv_ID
WHERE fim.Final_Inventory_Status IN ('Instock - Loose', 'Instock - Jewellery');

-- Placeholder — logic not finalized yet. Kept inactive until real logic
-- lands; see investigations config row below (is_active = FALSE).
CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_investigation_5_2` AS
SELECT CAST(NULL AS STRING) AS note
WHERE FALSE;

CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_investigation_5_3` AS
SELECT
  sfo.increment_id,
  sfo.created_at,
  Inv.Int_mas_Inventory_ID,
  Inv.Ex_Sku,
  Inv.Final_Inventory_Status,
  Inv.Final_Live_Location,
  Inv.Price_base_on_Rules_percent,
  Inv.Final_Carat_Weight,
  Inv.Final_Gemstone2,
  Inv.Ex_Shape,
  Inv.Ex_Cutting_Style,
  Inv.Int_mas_Lot_ID,
  Inv.Ex_New_FromDate,
  Inv.Ex_URL,
  Inv.Ex_Primary_Image
FROM `mis-gempundit.IMS_New_Version.Final_Inventory_Master` Inv
JOIN `mis-gempundit.mtd_orders.sales_flat_order` AS sfo
  ON Inv.In_out_Order_Number = sfo.increment_id
WHERE Inv.Final_Inventory_Status = 'Out of Stock'
  AND NOT (
    DATE(sfo.created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    AND sfo.status IN (
      'forwarded_to_mailroom','processing','processing_forwarded_awaiting_ap','processing_jewellery_pv_sent',
      'processing_making','processing_making_cad','processing_making_sent','processing_pending_approval_init',
      'processing_pooja_complete','processing_pooja_sent','processing_problem_approved','processing_problem_check_initial',
      'processing_problem_procurement','processing_problem_procurement_b','processing_problem_sales',
      'processing_qa_pass_jewelry','processing_ready_approval_initia','processing_ready_payment_pending',
      'processing_ready_pending_payment','processing_sent_lab','ring_sizer_awaiting_update','ring_sizer_sent',
      'submitted_to_vendor','processing_problem_sales_head','processing_qa_pass_normal'
    )
  );

CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_investigation_5_4` AS
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

CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_investigation_5_5` AS
WITH base AS (
  SELECT
    L.Lot_ID,
    L.Invoice_ID,
    L.Carat_Weight AS Carat_Weight_Before_Cutting,
    ROUND(SUM(I.Carat_Weight),2) AS Carat_Weight_After_Cutting
  FROM `mis-gempundit.IMS_New_Version.Invoice_Items` AS L
  LEFT JOIN `mis-gempundit.IMS_New_Version.Inventory_Master` AS I
    ON L.Lot_ID = I.Lot_ID
  GROUP BY
    L.Lot_ID, L.Invoice_ID, L.Carat_Weight
),
calc AS (
  SELECT
    b.*,
    CASE
      WHEN b.Carat_Weight_Before_Cutting = 0 THEN NULL
      ELSE ROUND(
        ((b.Carat_Weight_Before_Cutting - b.Carat_Weight_After_Cutting) / b.Carat_Weight_Before_Cutting) * 100,2)
    END AS Percent_Difference
  FROM base b
)
SELECT
  c.Lot_ID,
  a.Invoice_ID AS Invoice_ID_by_Account_Team,
  a.Total_Carat_weight AS Total_Carat_Weight_by_Account_Team,
  c.Carat_Weight_Before_Cutting,
  c.Carat_Weight_After_Cutting,
  c.Percent_Difference
FROM calc c
LEFT JOIN `mis-gempundit.IMS_New_Version.Invoice_by_Account_Team` AS a
  ON c.Invoice_ID = a.Invoice_ID
WHERE c.Percent_Difference >= 3;

CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_investigation_6_1` AS
SELECT
  o.increment_id AS Sold_Order_Number,
  o.created_at AS Sold_Date,
  fs.Int_mas_Inventory_ID AS Sold_Inv_ID,
  s.sku AS Sold_GP_ID,
  b.Order_ID AS BOM_Order_Number,
  b.Inv_ID AS BOM_Inv_ID,
  f.Ex_Sku AS BOM_GP_ID
FROM `mis-gempundit.mtd_orders.sales_flat_order_item` AS s
JOIN `mis-gempundit.mtd_orders.sales_flat_order` AS o
  ON s.order_id = o.entity_id
JOIN `mis-gempundit.IMS_New_Version.BOM` AS b
  ON CAST(s.item_id AS STRING) = b.Item_Id
LEFT JOIN `mis-gempundit.IMS_New_Version.Final_Inventory_Master` AS f
  ON CAST(f.Int_mas_Inventory_ID AS STRING) = b.Inv_ID
LEFT JOIN `mis-gempundit.IMS_New_Version.Final_Inventory_Master` AS fs
  ON s.sku = fs.Ex_Sku
WHERE s.sku != f.Ex_Sku
  AND NOT REGEXP_CONTAINS(f.Final_Gemstone2, r'^(Silver|Diamond)')
  AND NOT REGEXP_CONTAINS(fs.Final_Gemstone2, r'^(Silver|Diamond)')
  AND contains_substr(s.sku, 'GP');

CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_investigation_6_2` AS
SELECT
  o.increment_id AS Sold_Order_Number,
  o.created_at AS Sold_Date,
  s.sku AS Sold_GP_ID,
  fs.Final_Gemstone2 AS Sold_Gemstone2,
  b.Order_ID AS BOM_Order_Number,
  b.Inv_ID AS BOM_Inv_ID,
  fb.Ex_Sku AS BOM_GP_ID,
  fb.Final_Gemstone2 AS BOM_Gemstone2
FROM `mis-gempundit.mtd_orders.sales_flat_order_item` AS s
JOIN `mis-gempundit.mtd_orders.sales_flat_order` AS o
  ON s.order_id = o.entity_id
JOIN `mis-gempundit.IMS_New_Version.BOM` AS b
  ON CAST(s.item_id AS STRING) = b.Item_Id
LEFT JOIN `mis-gempundit.IMS_New_Version.Final_Inventory_Master` AS fs
  ON fs.Ex_Sku = s.sku
LEFT JOIN `mis-gempundit.IMS_New_Version.Final_Inventory_Master` AS fb
  ON CAST(fb.Int_mas_Inventory_ID AS STRING) = b.Inv_ID
WHERE fs.Final_Gemstone2 IS NOT NULL
  AND fb.Final_Gemstone2 IS NOT NULL
  AND NOT REGEXP_CONTAINS(fs.Final_Gemstone2, r'^(Silver|Diamond)')
  AND NOT REGEXP_CONTAINS(fb.Final_Gemstone2, r'^(Silver|Diamond)')
  AND fs.Final_Gemstone2 != fb.Final_Gemstone2
  AND CONTAINS_SUBSTR(s.sku, 'GP');

-- Placeholder views for the 4 future admin-only cases — empty stubs,
-- real logic to be written later, is_active = FALSE until then.
CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_extra_1` AS SELECT CAST(NULL AS STRING) AS note WHERE FALSE;
CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_extra_2` AS SELECT CAST(NULL AS STRING) AS note WHERE FALSE;
CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_extra_3` AS SELECT CAST(NULL AS STRING) AS note WHERE FALSE;
CREATE OR REPLACE VIEW `mis-gempundit.inventory_recon.v_extra_4` AS SELECT CAST(NULL AS STRING) AS note WHERE FALSE;
