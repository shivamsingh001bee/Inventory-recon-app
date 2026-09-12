import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateResolution, ResolutionFields } from "@/lib/investigations";

export const dynamic = "force-dynamic";

interface Body {
  id: string;
  keyValues: Record<string, string>;
  solved_date: string | null;
  action: string | null;
  reason: string | null;
  comment: string | null;
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.id || !body.keyValues) {
    return NextResponse.json({ error: "id and keyValues are required" }, { status: 400 });
  }

  const fields: ResolutionFields = {
    solved_date: body.solved_date?.trim() || null,
    action: body.action?.trim() || null,
    reason: body.reason?.trim() || null,
    comment: body.comment?.trim() || null
  };

  try {
    const matched = await updateResolution(body.id, body.keyValues, fields, session.user.email);
    if (!matched) {
      return NextResponse.json({ error: "No matching row found for the given key" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
