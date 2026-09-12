import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBigQuery, table } from "@/lib/bigquery";
import { runSingleInvestigation, currentReconWeek, canRunInvestigation } from "@/lib/investigations";

// A single investigation is one MERGE — comfortably under the Hobby
// ceiling, but set explicitly rather than inheriting a plan default.
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const role = ((session.user as any).role ?? "member") as string;
  const email = session.user.email;

  const body = await req.json().catch(() => ({}));
  const id = body?.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Look up assigned_emails to decide access — admins can always run any
  // investigation; everyone else needs to be explicitly assigned to this one.
  const bq = getBigQuery();
  const [rows] = await bq.query({
    query: `SELECT assigned_emails FROM ${table("investigations")} WHERE id = @id AND is_active = TRUE LIMIT 1`,
    params: { id }
  });
  if (rows.length === 0) {
    return NextResponse.json({ error: "Unknown or inactive investigation" }, { status: 404 });
  }
  const assignedEmails: string[] = Array.isArray((rows[0] as any).assigned_emails)
    ? (rows[0] as any).assigned_emails
    : [];
  if (!canRunInvestigation({ assigned_emails: assignedEmails }, role, email)) {
    return NextResponse.json({ error: "You're not assigned to run this investigation" }, { status: 403 });
  }

  const reconWeek = currentReconWeek();

  try {
    const result = await runSingleInvestigation(id, email, role, reconWeek);
    return NextResponse.json({ runId: result.runId, displayName: result.displayName, reconWeek });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[investigations/run-one] failed", { id, reconWeek, message });
    return NextResponse.json({ error: `Run failed: ${message}` }, { status: 500 });
  }
}
