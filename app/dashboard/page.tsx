"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface Summary {
  reconMonth: string;
  normalCount: number;
  lotCount: number;
  noPktCount: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/summary")
      .then((r) => r.json())
      .then(setSummary);
  }, []);

  const monthLabel = summary
    ? new Date(summary.reconMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <main>
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <p className="field-label mb-2">{monthLabel || "This month"}</p>
        <h1 className="font-display italic text-3xl mb-10">Your reconciliation progress</h1>

        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="card p-6">
            <p className="field-label">Normal entries submitted</p>
            <p className="font-mono text-4xl text-brass">{summary?.normalCount ?? "—"}</p>
          </div>
          <div className="card p-6">
            <p className="field-label">Lot entries submitted</p>
            <p className="font-mono text-4xl text-brass">{summary?.lotCount ?? "—"}</p>
          </div>
          <div className="card p-6">
            <p className="field-label">No Pkt No. entries</p>
            <p className="font-mono text-4xl text-brass">{summary?.noPktCount ?? "—"}</p>
          </div>
        </div>

        <div className="flex gap-4">
          <Link href="/entry/normal" className="btn-primary">
            New normal entry
          </Link>
          <Link href="/entry/lot" className="btn-ghost">
            New lot entry
          </Link>
          <Link href="/entry/no-pkt" className="btn-ghost">
            New no-pkt entry
          </Link>
        </div>
      </div>
    </main>
  );
}
