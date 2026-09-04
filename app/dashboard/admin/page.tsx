"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

interface Member {
  user_id: string;
  name: string;
  categories: string[];
  normal_count: number;
  lot_count: number;
}

export default function AdminDashboardPage() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [reconMonth, setReconMonth] = useState("");

  useEffect(() => {
    fetch("/api/summary/admin")
      .then((r) => r.json())
      .then((data) => {
        setMembers(data.members ?? []);
        setReconMonth(data.reconMonth ?? "");
      });
  }, []);

  const monthLabel = reconMonth
    ? new Date(reconMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <main>
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <p className="field-label mb-2">{monthLabel || "This month"}</p>
        <h1 className="font-display italic text-3xl mb-10">Team progress</h1>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line/20 text-left">
                <th className="field-label px-5 py-3">Member</th>
                <th className="field-label px-5 py-3">Category</th>
                <th className="field-label px-5 py-3 text-right">Normal</th>
                <th className="field-label px-5 py-3 text-right">Lot</th>
              </tr>
            </thead>
            <tbody>
              {members?.map((m) => (
                <tr key={m.user_id} className="border-b border-line/10 last:border-0">
                  <td className="px-5 py-3">{m.name}</td>
                  <td className="px-5 py-3 text-paper/50 font-mono text-xs">
                    {m.categories?.join(", ")}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-brass">{m.normal_count}</td>
                  <td className="px-5 py-3 text-right font-mono text-brass">{m.lot_count}</td>
                </tr>
              ))}
              {members?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-paper/40">
                    No active members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
