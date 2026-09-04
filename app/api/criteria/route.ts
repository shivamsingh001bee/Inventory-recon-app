import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBigQuery, table } from "@/lib/bigquery";
import type { Category } from "@/lib/types";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const category = req.nextUrl.searchParams.get("category") as Category | null;
  if (!category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }

  const allowedCategories = ((session.user as any).categories ?? []) as Category[];
  if (!allowedCategories.includes(category)) {
    return NextResponse.json({ error: "Not authorized for this category" }, { status: 403 });
  }

  const bq = getBigQuery();
  const query = `
    SELECT packet_no, gemstone
    FROM ${table("criteria")}
    WHERE category = @category AND is_active = TRUE
    ORDER BY packet_no
  `;
  const [rows] = await bq.query({ query, params: { category } });

  return NextResponse.json({ rows });
}
