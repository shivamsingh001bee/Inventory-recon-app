import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { currentReconMonth } from "@/lib/bigquery";
import { checkRunGuard, runMonthlyReconciliation } from "@/lib/recon";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const role = ((session.user as any).role ?? "member") as string;
  const reconMonth = currentReconMonth();

  const guard = await checkRunGuard(role, reconMonth);
  if (!guard.allowed) {
    return NextResponse.json({ error: guard.reason }, { status: 409 });
  }

  const runId = await runMonthlyReconciliation(session.user.email, role, reconMonth);

  return NextResponse.json({ runId, reconMonth });
}
