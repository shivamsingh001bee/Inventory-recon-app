import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRunGuard, runAllInvestigations, currentReconWeek } from "@/lib/investigations";

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

  const runId = await runAllInvestigations(session.user.email, role, reconWeek);

  return NextResponse.json({ runId, reconWeek });
}
