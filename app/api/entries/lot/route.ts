import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v4 as uuid } from "uuid";
import { authOptions } from "@/lib/auth";
import { getBigQuery, table, currentReconMonth } from "@/lib/bigquery";
import type { Category, LotEntryInput } from "@/lib/types";

interface Body {
  category: Category;
  entry: LotEntryInput;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as Body;
  const { category, entry } = body;

  if (!category || !entry?.lot_no) {
    return NextResponse.json({ error: "category and entry are required" }, { status: 400 });
  }

  const allowedCategories = ((session.user as any).categories ?? []) as Category[];
  if (!allowedCategories.includes(category)) {
    return NextResponse.json({ error: "Not authorized for this category" }, { status: 403 });
  }

  const bq = getBigQuery();
  const reconMonth = currentReconMonth();

  // Same pattern as Normal Entry: lot_no must not already exist for this month/category.
  const existingQuery = `
    SELECT lot_no
    FROM ${table("lot_entries")}
    WHERE category = @category
      AND recon_month = @reconMonth
      AND lot_no = @lotNo
    LIMIT 1
  `;
  const [existingRows] = await bq.query({
    query: existingQuery,
    params: { category, reconMonth, lotNo: entry.lot_no }
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
    category,
    submitted_by: session.user?.email,
    submitted_at: new Date().toISOString(),
    recon_month: reconMonth
  };

  await bq.dataset(process.env.BIGQUERY_DATASET!).table("lot_entries").insert([row]);

  return NextResponse.json({ submitted: 1 });
}
