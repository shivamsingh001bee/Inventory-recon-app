import { v4 as uuid } from "uuid";
import { getBigQuery, table } from "./bigquery";

export interface Investigation {
  id: string;
  display_name: string;
  view_name: string;
  table_name: string;
  group_number: string;
  admin_only: boolean;
  is_active: boolean;
  sort_order: number;
}

/** Monday of the week containing `d`, as YYYY-MM-DD. */
export function currentReconWeek(d: Date = new Date()): string {
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);
  const y = monday.getUTCFullYear();
  const m = String(monday.getUTCMonth() + 1).padStart(2, "0");
  const day2 = String(monday.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day2}`;
}

export async function listInvestigations(role: string): Promise<Investigation[]> {
  const bq = getBigQuery();
  const [rows] = await bq.query({
    query: `
      SELECT id, display_name, view_name, table_name, group_number, admin_only, is_active, sort_order
      FROM ${table("investigations")}
      WHERE is_active = TRUE
        AND (admin_only = FALSE OR @role = 'admin')
      ORDER BY sort_order
    `,
    params: { role }
  });
  return rows as Investigation[];
}

interface GuardResult {
  allowed: boolean;
  reason?: string;
}

export async function checkRunGuard(role: string, reconWeek: string): Promise<GuardResult> {
  if (role === "admin") return { allowed: true };

  const bq = getBigQuery();
  const [rows] = await bq.query({
    query: `
      SELECT run_by, run_at
      FROM ${table("investigation_runs")}
      WHERE recon_week = CAST(@reconWeek AS DATE)
      ORDER BY run_at DESC
      LIMIT 1
    `,
    params: { reconWeek }
  });

  if (rows.length > 0) {
    const { run_by, run_at } = rows[0] as { run_by: string; run_at: { value: string } };
    const when = new Date(run_at.value ?? run_at).toLocaleString();
    return {
      allowed: false,
      reason: `Already run this week by ${run_by} on ${when}. Ask an admin to re-run if needed.`
    };
  }

  return { allowed: true };
}

/**
 * Runs every active investigation for the given week. Fully generic —
 * loops over whatever the config table currently lists, so adding a new
 * investigation never requires touching this function.
 */
export async function runAllInvestigations(runBy: string, role: string, reconWeek: string): Promise<string> {
  const bq = getBigQuery();
  const runId = uuid();

  // Run against ALL active investigations, not just the ones visible to
  // this role — an admin's "Run Now" shouldn't skip member-visible cases,
  // and a member's "Run Now" should still refresh admin-only ones too,
  // since it's one shared weekly snapshot.
  const [investigations] = await bq.query({
    query: `
      SELECT id, display_name, view_name, table_name
      FROM ${table("investigations")}
      WHERE is_active = TRUE
      ORDER BY sort_order
    `
  });

  for (const inv of investigations as Investigation[]) {
    await bq.query({
      query: `DELETE FROM ${table(inv.table_name)} WHERE recon_week = CAST(@reconWeek AS DATE)`,
      params: { reconWeek }
    });
    await bq.query({
      query: `
        INSERT INTO ${table(inv.table_name)}
        SELECT @runId, CAST(@reconWeek AS DATE), CURRENT_TIMESTAMP(), @runBy, v.*
        FROM ${table(inv.view_name)} v
      `,
      params: { runId, reconWeek, runBy }
    });
  }

  await bq.dataset(process.env.BIGQUERY_DATASET!).table("investigation_runs").insert([
    {
      run_id: runId,
      recon_week: reconWeek,
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

/**
 * Fetches a saved investigation's rows for a given week, with the internal
 * bookkeeping columns stripped — the caller only cares about the
 * investigation's own columns.
 */
export async function fetchInvestigationReport(tableName: string, reconWeek: string): Promise<ReportRow[]> {
  const bq = getBigQuery();
  const [rows] = await bq.query({
    query: `SELECT * FROM ${table(tableName)} WHERE recon_week = CAST(@reconWeek AS DATE)`,
    params: { reconWeek }
  });
  return (rows as ReportRow[]).map((row) => {
    const { run_id, recon_week, run_at, run_by, ...rest } = row;
    return rest;
  });
}

export async function listReconWeeks(): Promise<{ recon_week: string; run_by: string; run_at: string }[]> {
  const bq = getBigQuery();
  const [rows] = await bq.query({
    query: `
      SELECT recon_week, run_by, run_at
      FROM ${table("investigation_runs")}
      QUALIFY ROW_NUMBER() OVER (PARTITION BY recon_week ORDER BY run_at DESC) = 1
      ORDER BY recon_week DESC
    `
  });
  return rows as { recon_week: string; run_by: string; run_at: string }[];
}
