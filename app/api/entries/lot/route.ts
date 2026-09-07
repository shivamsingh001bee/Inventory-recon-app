import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v4 as uuid } from "uuid";
import { authOptions } from "@/lib/auth";
import { getBigQuery, table, currentReconMonth } from "@/lib/bigquery";
import type { LotEntryInput } from "@/lib/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const entry = (await req.json()) as LotEntryInput;
  if (!entry?.lot_no || !entry.location || !entry.gemstone) {
    return NextResponse.json({ error: "lot_no, location and gemstone are required" }, { status: 400 });
  }

  const bq = getBigQuery();
  const reconMonth = currentReconMonth();

  const existingQuery = `
    SELECT lot_no
    FROM ${table("lot_entries")}
    WHERE recon_month = @reconMonth AND lot_no = @lotNo
    LIMIT 1
  `;
  const [existingRows] = await bq.query({
    query: existingQuery,
    params: { reconMonth, lotNo: entry.lot_no }
  });

  if (existingRows.length > 0) {
    return NextResponse.json(
      { error: `Lot No. ${entry.lot_no} already exists in database` },
      { status: 409 }
    );
  }

  const row = {
    entry_id: uuid(),
    lot_no: entry.lot_no,
    no_of_pcs: entry.no_of_pcs,
    carat_wt: entry.carat_wt,
    entry_date: entry.entry_date,
    comments: entry.comments ?? null,
    location: entry.location,
    gemstone: entry.gemstone,
    submitted_by: session.user?.email,
    submitted_at: new Date().toISOString(),
    recon_month: reconMonth
  };

  await bq.dataset(process.env.BIGQUERY_DATASET!).table("lot_entries").insert([row]);

  return NextResponse.json({ submitted: 1 });
}
