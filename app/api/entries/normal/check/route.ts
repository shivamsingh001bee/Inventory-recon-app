import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateNormalEntries } from "@/lib/validation";
import { currentReconMonth } from "@/lib/bigquery";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { packet_no, entry_numbers } = await req.json();
  if (!packet_no || !Array.isArray(entry_numbers)) {
    return NextResponse.json({ error: "packet_no and entry_numbers are required" }, { status: 400 });
  }

  const results = await validateNormalEntries(packet_no, entry_numbers, currentReconMonth());
  return NextResponse.json({ results });
}
