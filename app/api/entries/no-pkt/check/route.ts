import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateNoPktEntries } from "@/lib/validation";
import { currentReconMonth } from "@/lib/bigquery";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { entry_numbers } = await req.json();
  if (!Array.isArray(entry_numbers)) {
    return NextResponse.json({ error: "entry_numbers is required" }, { status: 400 });
  }

  const results = await validateNoPktEntries(entry_numbers, currentReconMonth());
  return NextResponse.json({ results });
}
