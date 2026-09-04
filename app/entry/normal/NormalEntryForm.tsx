"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { Category, CriteriaRow } from "@/lib/types";

interface Row {
  packet_no: string;
  gemstone: string;
}

interface RejectedRow {
  packet_no: string;
  reason: string;
}

export default function NormalEntryForm() {
  const { data: session } = useSession();
  const categories = ((session?.user as any)?.categories ?? []) as Category[];

  const [category, setCategory] = useState<Category | "">("");
  const [criteria, setCriteria] = useState<CriteriaRow[]>([]);
  const [rows, setRows] = useState<Row[]>([{ packet_no: "", gemstone: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ submitted: number; rejected: RejectedRow[] } | null>(null);

  // Default to the user's only category if they have just one.
  useEffect(() => {
    if (categories.length === 1) setCategory(categories[0]);
  }, [categories]);

  useEffect(() => {
    if (!category) return;
    fetch(`/api/criteria?category=${category}`)
      .then((r) => r.json())
      .then((data) => setCriteria(data.rows ?? []));
  }, [category]);

  function updatePacket(index: number, packet_no: string) {
    const match = criteria.find((c) => c.packet_no === packet_no);
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { packet_no, gemstone: match?.gemstone ?? "" } : r))
    );
  }

  function addRow() {
    setRows((prev) => [...prev, { packet_no: "", gemstone: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setResult(null);
    try {
      const entries = rows.filter((r) => r.packet_no);
      const res = await fetch("/api/entries/normal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, entries })
      });
      const data = await res.json();
      setResult(data);
      if (data.rejected?.length === 0) {
        setRows([{ packet_no: "", gemstone: "" }]);
      } else {
        // keep only the rejected packet numbers on screen so the person can fix them
        const rejectedNos = new Set(data.rejected.map((r: RejectedRow) => r.packet_no));
        setRows((prev) => prev.filter((r) => rejectedNos.has(r.packet_no)));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {categories.length > 1 && (
        <div className="mb-8">
          <p className="field-label">Category</p>
          <div className="flex gap-3">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-4 py-2 rounded text-sm border transition-colors ${
                  category === c
                    ? "border-brass text-brass"
                    : "border-line/30 text-paper/60 hover:text-paper"
                }`}
              >
                {c === "under_2L" ? "Under ₹2L" : "Above ₹2L"}
              </button>
            ))}
          </div>
        </div>
      )}

      {category && (
        <>
          <div className="space-y-3 mb-6">
            {rows.map((row, i) => (
              <div key={i} className="flex gap-3 items-end">
                <div className="flex-1">
                  <p className="field-label">Packet No.</p>
                  <select
                    className="field-input"
                    value={row.packet_no}
                    onChange={(e) => updatePacket(i, e.target.value)}
                  >
                    <option value="">Select…</option>
                    {criteria.map((c) => (
                      <option key={c.packet_no} value={c.packet_no}>
                        {c.packet_no}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <p className="field-label">Gemstone</p>
                  <input className="field-input opacity-70" value={row.gemstone} readOnly />
                </div>
                {rows.length > 1 && (
                  <button
                    onClick={() => removeRow(i)}
                    className="text-paper/40 hover:text-rust text-sm pb-2.5 px-1"
                    aria-label="Remove row"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mb-10">
            <button onClick={addRow} className="btn-ghost">
              + Add packet
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || rows.every((r) => !r.packet_no)}
              className="btn-primary"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>

          {result && (
            <div className="card p-5">
              <p className="text-paper mb-2">
                <span className="text-brass font-mono">{result.submitted}</span> entries recorded.
              </p>
              {result.rejected.length > 0 && (
                <div>
                  <p className="field-label mb-2 text-rust">Rejected — fix and resubmit</p>
                  <ul className="space-y-1">
                    {result.rejected.map((r, i) => (
                      <li key={i} className="text-sm text-rust/90 font-mono">
                        {r.packet_no} — {r.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
