-- MIGRATION 07b: Create each investigation's table by deriving its schema
-- directly from its view — this avoids hand-guessing column types across
-- 8+ source tables we don't have full visibility into. Run AFTER 07a.
--
-- Pattern: CREATE TABLE ... PARTITION BY recon_week AS SELECT <4 metadata
-- columns>, v.* FROM view WHERE FALSE — creates the table with zero rows
-- but the exact correct schema, metadata columns first.

CREATE TABLE `mis-gempundit.inventory_recon.investigation_1_1`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_investigation_1_1` v WHERE FALSE;

CREATE TABLE `mis-gempundit.inventory_recon.investigation_1_2`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_investigation_1_2` v WHERE FALSE;

CREATE TABLE `mis-gempundit.inventory_recon.investigation_2`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_investigation_2` v WHERE FALSE;

CREATE TABLE `mis-gempundit.inventory_recon.investigation_3`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_investigation_3` v WHERE FALSE;

CREATE TABLE `mis-gempundit.inventory_recon.investigation_4_1`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_investigation_4_1` v WHERE FALSE;

CREATE TABLE `mis-gempundit.inventory_recon.investigation_4_2`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_investigation_4_2` v WHERE FALSE;

CREATE TABLE `mis-gempundit.inventory_recon.investigation_4_3`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_investigation_4_3` v WHERE FALSE;

CREATE TABLE `mis-gempundit.inventory_recon.investigation_4_4`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_investigation_4_4` v WHERE FALSE;

CREATE TABLE `mis-gempundit.inventory_recon.investigation_5_1`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_investigation_5_1` v WHERE FALSE;

CREATE TABLE `mis-gempundit.inventory_recon.investigation_5_2`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_investigation_5_2` v WHERE FALSE;

CREATE TABLE `mis-gempundit.inventory_recon.investigation_5_3`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_investigation_5_3` v WHERE FALSE;

CREATE TABLE `mis-gempundit.inventory_recon.investigation_5_4`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_investigation_5_4` v WHERE FALSE;

CREATE TABLE `mis-gempundit.inventory_recon.investigation_5_5`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_investigation_5_5` v WHERE FALSE;

CREATE TABLE `mis-gempundit.inventory_recon.investigation_6_1`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_investigation_6_1` v WHERE FALSE;

CREATE TABLE `mis-gempundit.inventory_recon.investigation_6_2`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_investigation_6_2` v WHERE FALSE;

CREATE TABLE `mis-gempundit.inventory_recon.extra_1`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_extra_1` v WHERE FALSE;

CREATE TABLE `mis-gempundit.inventory_recon.extra_2`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_extra_2` v WHERE FALSE;

CREATE TABLE `mis-gempundit.inventory_recon.extra_3`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_extra_3` v WHERE FALSE;

CREATE TABLE `mis-gempundit.inventory_recon.extra_4`
PARTITION BY recon_week AS
SELECT CAST(NULL AS STRING) AS run_id, CAST(NULL AS DATE) AS recon_week, CAST(NULL AS TIMESTAMP) AS run_at, CAST(NULL AS STRING) AS run_by, v.*
FROM `mis-gempundit.inventory_recon.v_extra_4` v WHERE FALSE;

-- ============================================
-- Config data — this is what actually drives the app. Add a row here
-- (plus its view + table) to add a new investigation later.
-- ============================================
INSERT INTO `mis-gempundit.inventory_recon.investigations`
  (id, display_name, view_name, table_name, group_number, admin_only, is_active, sort_order)
VALUES
  ('1_1', 'Investigation #1.1', 'v_investigation_1_1', 'investigation_1_1', '1', FALSE, TRUE, 10),
  ('1_2', 'Investigation #1.2', 'v_investigation_1_2', 'investigation_1_2', '1', FALSE, TRUE, 20),
  ('2',   'Investigation #2',   'v_investigation_2',   'investigation_2',   '2', FALSE, TRUE, 30),
  ('3',   'Investigation #3',   'v_investigation_3',   'investigation_3',   '3', FALSE, TRUE, 40),
  ('4_1', 'Investigation #4.1', 'v_investigation_4_1', 'investigation_4_1', '4', FALSE, TRUE, 50),
  ('4_2', 'Investigation #4.2', 'v_investigation_4_2', 'investigation_4_2', '4', FALSE, TRUE, 60),
  ('4_3', 'Investigation #4.3', 'v_investigation_4_3', 'investigation_4_3', '4', FALSE, TRUE, 70),
  ('4_4', 'Investigation #4.4', 'v_investigation_4_4', 'investigation_4_4', '4', FALSE, TRUE, 80),
  ('5_1', 'Investigation #5.1', 'v_investigation_5_1', 'investigation_5_1', '5', FALSE, TRUE, 90),
  ('5_2', 'Investigation #5.2', 'v_investigation_5_2', 'investigation_5_2', '5', FALSE, FALSE, 100),
  ('5_3', 'Investigation #5.3', 'v_investigation_5_3', 'investigation_5_3', '5', FALSE, TRUE, 110),
  ('5_4', 'Investigation #5.4', 'v_investigation_5_4', 'investigation_5_4', '5', FALSE, TRUE, 120),
  ('5_5', 'Investigation #5.5', 'v_investigation_5_5', 'investigation_5_5', '5', FALSE, TRUE, 130),
  ('6_1', 'Investigation #6.1', 'v_investigation_6_1', 'investigation_6_1', '6', FALSE, TRUE, 140),
  ('6_2', 'Investigation #6.2', 'v_investigation_6_2', 'investigation_6_2', '6', FALSE, TRUE, 150),
  ('extra_1', 'Extra 1', 'v_extra_1', 'extra_1', 'extra', TRUE, FALSE, 200),
  ('extra_2', 'Extra 2', 'v_extra_2', 'extra_2', 'extra', TRUE, FALSE, 210),
  ('extra_3', 'Extra 3', 'v_extra_3', 'extra_3', 'extra', TRUE, FALSE, 220),
  ('extra_4', 'Extra 4', 'v_extra_4', 'extra_4', 'extra', TRUE, FALSE, 230);

-- Note: is_active = FALSE for '5_2' and the 4 'extra_*' rows means Run Now
-- skips them and they won't appear as tabs, until real logic exists and
-- you flip is_active to TRUE (UPDATE ... SET is_active = TRUE WHERE id = '5_2').
