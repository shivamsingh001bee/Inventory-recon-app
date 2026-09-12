import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runSingleInvestigation, currentReconWeek } from "@/lib/investigations";

// A single investigation is one DELETE+INSERT — comfortably under the Hobby
// ceiling, but set explicitly rather than inheriting a plan default.
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const role = ((session.user as any).role ?? "member") as string;
  if (role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const id = body?.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const reconWeek = currentReconWeek();

  try {
    const result = await runSingleInvestigation(id, session.user.email, role, reconWeek);
    return NextResponse.json({ runId: result.runId, displayName: result.displayName, reconWeek });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[investigations/run-one] failed", { id, reconWeek, message });
    return NextResponse.json({ error: `Run failed: ${message}` }, { status: 500 });
  }
}
