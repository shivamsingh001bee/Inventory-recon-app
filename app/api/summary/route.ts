import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBigQuery, table, currentReconMonth } from "@/lib/bigquery";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const bq = getBigQuery();
  const reconMonth = currentReconMonth();

  const query = `
    SELECT
      (SELECT COUNT(*) FROM ${table("normal_entries")}
        WHERE submitted_by = @email AND recon_month = @reconMonth) AS normal_count,
      (SELECT COUNT(*) FROM ${table("lot_entries")}
        WHERE submitted_by = @email AND recon_month = @reconMonth) AS lot_count,
      (SELECT COUNT(*) FROM ${table("no_pkt_entries")}
        WHERE submitted_by = @email AND recon_month = @reconMonth) AS no_pkt_count
  `;
  const [rows] = await bq.query({
    query,
    params: { email: session.user.email, reconMonth }
  });

  const row = rows[0] ?? { normal_count: 0, lot_count: 0, no_pkt_count: 0 };
  return NextResponse.json({
    reconMonth,
    normalCount: Number(row.normal_count),
    lotCount: Number(row.lot_count),
    noPktCount: Number(row.no_pkt_count)
  });
}
