import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v4 as uuid } from "uuid";
import { authOptions } from "@/lib/auth";
import { getBigQuery, table, currentReconMonth } from "@/lib/bigquery";
import type { Category, NormalEntryInput } from "@/lib/types";

interface Body {
  category: Category;
  entries: NormalEntryInput[]; // supports single or batch (Lot-style bulk) submission
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as Body;
  const { category, entries } = body;

  if (!category || !entries?.length) {
    return NextResponse.json({ error: "category and entries are required" }, { status: 400 });
  }

  const allowedCategories = ((session.user as any).categories ?? []) as Category[];
  if (!allowedCategories.includes(category)) {
    return NextResponse.json({ error: "Not authorized for this category" }, { status: 403 });
  }

  // --- Check 1: duplicate packet_no within this submission batch ---
  const seen = new Set<string>();
  const batchDuplicates: string[] = [];
  for (const e of entries) {
    if (seen.has(e.packet_no)) {
      batchDuplicates.push(e.packet_no);
    }
    seen.add(e.packet_no);
  }

  const bq = getBigQuery();
  const reconMonth = currentReconMonth();

  // --- Check 2: packet_no already present in normal_entries for this month/category ---
  const candidatePacketNos = Array.from(seen);
  const existingQuery = `
    SELECT packet_no
    FROM ${table("normal_entries")}
    WHERE category = @category
      AND recon_month = @reconMonth
      AND packet_no IN UNNEST(@packetNos)
  `;
  const [existingRows] = await bq.query({
    query: existingQuery,
    params: { category, reconMonth, packetNos: candidatePacketNos }
  });
  const alreadyInDatabase = new Set(existingRows.map((r: any) => r.packet_no as string));

  // Anything flagged by either check is rejected; everything else is clean to insert.
  const rejected: { packet_no: string; reason: string }[] = [];
  const clean: NormalEntryInput[] = [];
  const insertedForBatch = new Set<string>();

  for (const e of entries) {
    if (alreadyInDatabase.has(e.packet_no)) {
      rejected.push({ packet_no: e.packet_no, reason: "Already exists in database" });
      continue;
    }
    if (insertedForBatch.has(e.packet_no)) {
      rejected.push({ packet_no: e.packet_no, reason: "Duplicate within this submission" });
      continue;
    }
    insertedForBatch.add(e.packet_no);
    clean.push(e);
  }

  if (clean.length > 0) {
    const rows = clean.map((e) => ({
      entry_id: uuid(),
      packet_no: e.packet_no,
      gemstone: e.gemstone,
      category,
      submitted_by: session.user?.email,
      submitted_at: new Date().toISOString(),
      recon_month: reconMonth
    }));

    await bq.dataset(process.env.BIGQUERY_DATASET!).table("normal_entries").insert(rows);
  }

  return NextResponse.json({
    submitted: clean.length,
    rejected
  });
}
