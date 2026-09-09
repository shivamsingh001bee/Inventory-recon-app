import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchReport, type ReconCase } from "@/lib/recon";

const VALID_CASES: ReconCase[] = ["missing_from_master", "missing_from_entries", "out_of_stock_but_found"];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const reconCase = req.nextUrl.searchParams.get("case") as ReconCase | null;
  const month = req.nextUrl.searchParams.get("month");
  const minPriceParam = req.nextUrl.searchParams.get("minPrice");
  const maxPriceParam = req.nextUrl.searchParams.get("maxPrice");

  if (!reconCase || !VALID_CASES.includes(reconCase) || !month) {
    return NextResponse.json({ error: "case and month are required" }, { status: 400 });
  }

  const minPrice = minPriceParam ? Number(minPriceParam) : undefined;
  const maxPrice = maxPriceParam ? Number(maxPriceParam) : undefined;

  const rows = await fetchReport(reconCase, month, minPrice, maxPrice);
  return NextResponse.json({ rows });
}
