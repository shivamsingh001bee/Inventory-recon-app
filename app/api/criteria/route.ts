import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBigQuery, table } from "@/lib/bigquery";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const bq = getBigQuery();

  const [gemstoneRows] = await bq.query({
    query: `
      SELECT DISTINCT gemstone
      FROM ${table("criteria")}
      WHERE is_active = TRUE AND gemstone IS NOT NULL AND gemstone != ""
      ORDER BY gemstone
    `
  });

  const [locationRows] = await bq.query({
    query: `
      SELECT DISTINCT location
      FROM ${table("criteria")}
      WHERE is_active = TRUE AND location IS NOT NULL AND location != ""
      ORDER BY location
    `
  });

  return NextResponse.json({
    gemstones: gemstoneRows.map((r: any) => r.gemstone),
    locations: locationRows.map((r: any) => r.location)
  });
}
