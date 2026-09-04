import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBigQuery, table, currentReconMonth } from "@/lib/bigquery";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const bq = getBigQuery();
  const reconMonth = currentReconMonth();

  const query = `
    SELECT
      u.user_id,
      u.name,
      u.categories,
      IFNULL(n.normal_count, 0) AS normal_count,
      IFNULL(l.lot_count, 0) AS lot_count
    FROM ${table("users")} u
    LEFT JOIN (
      SELECT submitted_by, COUNT(*) AS normal_count
      FROM ${table("normal_entries")}
      WHERE recon_month = @reconMonth
      GROUP BY submitted_by
    ) n ON n.submitted_by = u.user_id
    LEFT JOIN (
      SELECT submitted_by, COUNT(*) AS lot_count
      FROM ${table("lot_entries")}
      WHERE recon_month = @reconMonth
      GROUP BY submitted_by
    ) l ON l.submitted_by = u.user_id
    WHERE u.active = TRUE
    ORDER BY u.name
  `;
  const [rows] = await bq.query({ query, params: { reconMonth } });

  return NextResponse.json({ reconMonth, members: rows });
}
