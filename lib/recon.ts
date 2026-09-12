import { v4 as uuid } from "uuid";
import { getBigQuery, table, masterTable } from "./bigquery";

export type ReconCase = "missing_from_master" | "missing_from_entries" | "out_of_stock_but_found";

const CASE_TABLE: Record<ReconCase, string> = {
  missing_from_master: "recon_missing_from_master",
  missing_from_entries: "recon_missing_from_entries",
  out_of_stock_but_found: "recon_out_of_stock_but_found"
};

interface GuardResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Members can run once per recon_month; admins can re-run whenever they
 * want (each re-run replaces that month's saved rows, it doesn't stack).
 */
export async function checkRunGuard(role: string, reconMonth: string): Promise<GuardResult> {
  if (role === "admin") return { allowed: true };

  const bq = getBigQuery();
  const [rows] = await bq.query({
    query: `
      SELECT run_by, run_at
      FROM ${table("recon_runs")}
      WHERE recon_month = CAST(@reconMonth AS DATE)
      ORDER BY run_at DESC
      LIMIT 1
    `,
    params: { reconMonth }
  });

  if (rows.length > 0) {
    const { run_by, run_at } = rows[0] as { run_by: string; run_at: { value: string } };
    const when = new Date(run_at.value ?? run_at).toLocaleString();
    return {
      allowed: false,
      reason: `Already run this month by ${run_by} on ${when}. Ask an admin to re-run if needed.`
    };
  }

  return { allowed: true };
}

/**
 * Runs all three comparisons for the given month and replaces that month's
 * saved rows in each of the three report tables. Assumes the guard has
 * already been checked by the caller.
 */
export async function runMonthlyReconciliation(runBy: string, role: string, reconMonth: string): Promise<string> {
  const bq = getBigQuery();
  const runId = uuid();
  const params = { reconMonth, runId, runBy };

  // --- Case 1: in normal_entries but not in the master ---
  await bq.query({
    query: `DELETE FROM ${table("recon_missing_from_master")} WHERE recon_month = CAST(@reconMonth AS DATE)`,
    params: { reconMonth }
  });
  await bq.query({
    query: `
      INSERT INTO ${table("recon_missing_from_master")}
        (run_id, recon_month, run_at, run_by, entry_number, packet_no, gemstone, submitted_by, submitted_at)
      SELECT
        @runId, CAST(@reconMonth AS DATE), CURRENT_TIMESTAMP(), @runBy,
        ne.entry_number, ne.packet_no, ne.gemstone, ne.submitted_by, ne.submitted_at
      FROM ${table("normal_entries")} ne
      WHERE ne.recon_month = CAST(@reconMonth AS DATE)
        AND NOT EXISTS (
          SELECT 1 FROM ${masterTable()} fm
          WHERE CAST(fm.Int_mas_Inventory_ID AS STRING) = ne.entry_number
        )
    `,
    params
  });

  // --- Case 2: in the master (not Out of Stock) but not in normal_entries this month ---
  await bq.query({
    query: `DELETE FROM ${table("recon_missing_from_entries")} WHERE recon_month = CAST(@reconMonth AS DATE)`,
    params: { reconMonth }
  });
  await bq.query({
    query: `
      INSERT INTO ${table("recon_missing_from_entries")}
        (run_id, recon_month, run_at, run_by, inv_id, status, location, gemstone, price, full_row)
      SELECT
        @runId, CAST(@reconMonth AS DATE), CURRENT_TIMESTAMP(), @runBy,
        CAST(fm.Int_mas_Inventory_ID AS STRING), fm.Final_Inventory_Status, fm.Final_Live_Location,
        fm.Final_Gemstone2, SAFE_CAST(fm.Final_formula_Based_Price AS NUMERIC), TO_JSON_STRING(fm)
      FROM ${masterTable()} fm
      WHERE fm.Final_Inventory_Status != 'Out of Stock'
        AND NOT EXISTS (
          SELECT 1 FROM ${table("normal_entries")} ne
          WHERE ne.recon_month = CAST(@reconMonth AS DATE) AND ne.entry_number = CAST(fm.Int_mas_Inventory_ID AS STRING)
        )
    `,
    params
  });

  // --- Case 3: Out of Stock in the master, but physically entered this month ---
  await bq.query({
    query: `DELETE FROM ${table("recon_out_of_stock_but_found")} WHERE recon_month = CAST(@reconMonth AS DATE)`,
    params: { reconMonth }
  });
  await bq.query({
    query: `
      INSERT INTO ${table("recon_out_of_stock_but_found")}
        (run_id, recon_month, run_at, run_by, inv_id, status, location, gemstone, price, full_row,
         found_packet_no, found_by, found_at)
      SELECT
        @runId, CAST(@reconMonth AS DATE), CURRENT_TIMESTAMP(), @runBy,
        CAST(fm.Int_mas_Inventory_ID AS STRING), fm.Final_Inventory_Status, fm.Final_Live_Location,
        fm.Final_Gemstone2, SAFE_CAST(fm.Final_formula_Based_Price AS NUMERIC), TO_JSON_STRING(fm),
        ne.packet_no, ne.submitted_by, ne.submitted_at
      FROM ${masterTable()} fm
      JOIN ${table("normal_entries")} ne
  ON ne.entry_number = CAST(fm.Int_mas_Inventory_ID AS STRING) AND ne.recon_month = CAST(@reconMonth AS DATE)
      WHERE fm.Final_Inventory_Status = 'Out of Stock'
    `,
    params
  });

  // --- Log the run (for the guard + the "who ran this" display) ---
  await bq.dataset(process.env.BIGQUERY_DATASET!).table("recon_runs").insert([
    {
      run_id: runId,
      recon_month: reconMonth,
      run_by: runBy,
      run_role: role,
      run_at: new Date().toISOString()
    }
  ]);

  return runId;
}

export interface ReportRow {
  [key: string]: unknown;
}

export async function fetchReport(
  reconCase: ReconCase,
  reconMonth: string,
  minPrice?: number,
  maxPrice?: number
): Promise<ReportRow[]> {
  const bq = getBigQuery();
  const tableName = CASE_TABLE[reconCase];

  const priceFilters: string[] = [];
  const params: Record<string, unknown> = { reconMonth };

  if (reconCase !== "missing_from_master") {
    if (minPrice !== undefined) {
      priceFilters.push("price >= @minPrice");
      params.minPrice = minPrice;
    }
    if (maxPrice !== undefined) {
      priceFilters.push("price <= @maxPrice");
      params.maxPrice = maxPrice;
    }
  }

  const whereClause = ["recon_month = CAST(@reconMonth AS DATE)", ...priceFilters].join(" AND ");

  const [rows] = await bq.query({
    query: `SELECT * FROM ${table(tableName)} WHERE ${whereClause} ORDER BY run_at DESC`,
    params
  });

  return rows;
}

export async function listReconMonths(): Promise<{ recon_month: string; run_by: string; run_at: string }[]> {
  const bq = getBigQuery();
  const [rows] = await bq.query({
    query: `
      SELECT recon_month, run_by, run_at
      FROM ${table("recon_runs")}
      QUALIFY ROW_NUMBER() OVER (PARTITION BY recon_month ORDER BY run_at DESC) = 1
      ORDER BY recon_month DESC
    `
  });
  return rows as { recon_month: string; run_by: string; run_at: string }[];
}
