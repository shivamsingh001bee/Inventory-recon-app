-- MIGRATION 06: Drop the old 3-case monthly reconciliation system.
-- Fully replaced by the dynamic Investigations system (migration 07).

DROP VIEW IF EXISTS `mis-gempundit.inventory_recon.v_recon_missing_from_master`;
DROP VIEW IF EXISTS `mis-gempundit.inventory_recon.v_recon_missing_from_entries`;
DROP VIEW IF EXISTS `mis-gempundit.inventory_recon.v_recon_out_of_stock_but_found`;

DROP TABLE IF EXISTS `mis-gempundit.inventory_recon.recon_missing_from_master`;
DROP TABLE IF EXISTS `mis-gempundit.inventory_recon.recon_missing_from_entries`;
DROP TABLE IF EXISTS `mis-gempundit.inventory_recon.recon_out_of_stock_but_found`;
DROP TABLE IF EXISTS `mis-gempundit.inventory_recon.recon_runs`;
