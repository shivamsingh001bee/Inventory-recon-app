import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRunGuard, runAllInvestigations, currentReconWeek } from "@/lib/investigations";

// Without this the function inherits the plan default (10s on Hobby), which
// is nowhere near enough for the investigation script. 60 is the Hobby
// ceiling — the build fails if you exceed it there. On Pro, raise to 300.
export const maxDuration = 60;

// The BigQuery script must not be served from a cached/static render.
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const role = ((session.user as any).role ?? "member") as string;
  const reconWeek = currentReconWeek();

  const guard = await checkRunGuard(role, reconWeek);
  if (!guard.allowed) {
    return NextResponse.json({ error: guard.reason }, { status: 409 });
  }

  try {
    const runId = await runAllInvestigations(session.user.email, role, reconWeek);
    return NextResponse.json({ runId, reconWeek });
  } catch (err) {
    // The old code let this bubble up as an opaque 500, which is exactly how
    // a half-finished run looked like a data problem. Surface the real cause.
    const message = err instanceof Error ? err.message : String(err);
    console.error("[investigations/run] failed", { reconWeek, role, message });
    return NextResponse.json({ error: `Run failed: ${message}` }, { status: 500 });
  }
}
