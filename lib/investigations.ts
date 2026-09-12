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

/**
 * view_name / table_name come out of the investigations config table and get
 * interpolated straight into SQL. They're admin-managed, but interpolated
 * identifiers are an injection surface regardless — validate before use.
 */
const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;

function assertSafeIdentifier(name: string, field: string): string {
  if (!SAFE_IDENTIFIER.test(name)) {
    throw new Error(`Unsafe ${field} in investigations config: ${JSON.stringify(name)}`);
  }
  return name;
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
 * Runs every active investigation for the given week.
 *
 * The whole thing is emitted as ONE multi-statement BigQuery script rather
 * than 2 sequential client-side queries per investigation. The old version
 * issued 28+ separate jobs back to back; each job costs a round trip plus
 * creation latency, which blew past the Vercel function timeout partway
 * through the loop and silently left later investigations unpopulated.
 *
 * One script = one job. Statements still execute in order server-side, and
 * BigQuery rolls the whole script back if any statement fails, so a run is
 * now all-or-nothing instead of half-applied.
 *
 * The run-log row is appended inside the script too. It used to go through
 * the legacy streaming insert API, which pins the table's streaming buffer
 * and makes DELETE/UPDATE on investigation_runs fail for ~90 minutes.
 */
export async function runAllInvestigations(runBy: string, role: string, reconWeek: string): Promise<string> {
  const bq = getBigQuery();
  const runId = uuid();

  const [rows] = await bq.query({
    query: `
      SELECT id, display_name, view_name, table_name
      FROM ${table("investigations")}
      WHERE is_active = TRUE
      ORDER BY sort_order
    `
  });

  const investigations = rows as Investigation[];
  if (investigations.length === 0) {
    throw new Error(
      "No active investigations in the config table — nothing to run. Seed `investigations` first."
    );
  }

  const statements = investigations.map((inv) => {
    const tbl = table(assertSafeIdentifier(inv.table_name, "table_name"));
    const view = table(assertSafeIdentifier(inv.view_name, "view_name"));
    return [
      `DELETE FROM ${tbl} WHERE recon_week = CAST(@reconWeek AS DATE);`,
      `INSERT INTO ${tbl}`,
      `SELECT @runId, CAST(@reconWeek AS DATE), CURRENT_TIMESTAMP(), @runBy, v.*`,
      `FROM ${view} v;`
    ].join("\n");
  });

  statements.push(
    [
      `INSERT INTO ${table("investigation_runs")} (run_id, recon_week, run_by, run_role, run_at)`,
      `VALUES (@runId, CAST(@reconWeek AS DATE), @runBy, @role, CURRENT_TIMESTAMP());`
    ].join("\n")
  );

  await bq.query({
    query: statements.join("\n\n"),
    params: { runId, reconWeek, runBy, role }
  });

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
    query: `SELECT * FROM ${table(assertSafeIdentifier(tableName, "table_name"))} WHERE recon_week = CAST(@reconWeek AS DATE)`,
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
