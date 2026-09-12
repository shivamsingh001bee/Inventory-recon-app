import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { bulkUpsertResolutions, BulkResolutionRow } from "@/lib/investigations";

// Sequential per-row updates (see lib/investigations.ts) — capped at 200
// rows, but give it real headroom rather than inheriting the Hobby default.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface Body {
  id: string;
  rows: BulkResolutionRow[];
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.id || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: "id and rows are required" }, { status: 400 });
  }

  try {
    const result = await bulkUpsertResolutions(body.id, body.rows, session.user.email);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
