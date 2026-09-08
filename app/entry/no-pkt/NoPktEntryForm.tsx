"use client";

import { useEffect, useState } from "react";

interface RowResult {
  entry_number: string;
  status: string;
  detail?: string;
  valid: boolean;
}

export default function NoPktEntryForm() {
  const [gemstones, setGemstones] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const [location, setLocation] = useState("");
  const [gemstone, setGemstone] = useState("");
  const [entryNumbers, setEntryNumbers] = useState<string[]>([""]);
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedCount, setSubmittedCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/criteria")
      .then((r) => r.json())
      .then((data) => {
        setGemstones(data.gemstones ?? []);
        setLocations(data.locations ?? []);
      });
  }, []);

  function updateEntry(index: number, value: string) {
    setEntryNumbers((prev) => prev.map((v, i) => (i === index ? value : v)));
    setResults(null);
    setSubmittedCount(null);
  }

  function addRow() {
    setEntryNumbers((prev) => [...prev, ""]);
  }

  function removeRow(index: number) {
    setEntryNumbers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCheckAndSubmit() {
    setSubmitting(true);
    setSubmittedCount(null);
    try {
      const cleanEntries = entryNumbers.filter((e) => e.trim() !== "");
      const res = await fetch("/api/entries/no-pkt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, gemstone, entry_numbers: cleanEntries })
      });
      const data = await res.json();
      setResults(data.results ?? null);
      if (data.submitted > 0) {
        setSubmittedCount(data.submitted);
        setEntryNumbers([""]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const canCheck = location && gemstone && entryNumbers.some((e) => e.trim() !== "");

  function statusFor(id: string): RowResult | undefined {
    return results?.find((r) => r.entry_number === id.trim());
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <p className="field-label">Location</p>
          <select
            className="field-input"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setResults(null);
            }}
          >
            <option value="">Select…</option>
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="field-label">Gemstone</p>
          <select
            className="field-input"
            value={gemstone}
            onChange={(e) => {
              setGemstone(e.target.value);
              setResults(null);
            }}
          >
            <option value="">Select…</option>
            {gemstones.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="field-label mb-3">Entry Numbers</p>
      <div className="space-y-2 mb-4">
        {entryNumbers.map((val, i) => {
          const result = statusFor(val);
          return (
            <div key={i} className="flex gap-3 items-center">
              <span className="text-slate/60 font-mono text-xs w-6 text-right">{i + 1}</span>
              <input
                className={`field-input flex-1 ${
                  result ? (result.valid ? "border-emerald" : "border-ruby") : ""
                }`}
                value={val}
                onChange={(e) => updateEntry(i, e.target.value)}
                placeholder="Entry number"
              />
              {result && (
                <span className={`text-xs font-mono w-64 ${result.valid ? "text-emerald" : "text-ruby"}`}>
                  {result.status}
                  {result.detail ? ` ${result.detail}` : ""}
                </span>
              )}
              {entryNumbers.length > 1 && (
                <button
                  onClick={() => removeRow(i)}
                  className="text-slate hover:text-ruby text-sm px-1"
                  aria-label="Remove row"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 mb-8">
        <button onClick={addRow} className="btn-ghost">
          + Add entry
        </button>
        <button onClick={handleCheckAndSubmit} disabled={!canCheck || submitting} className="btn-primary">
          {submitting ? "Checking…" : "Check & Submit"}
        </button>
      </div>

      {submittedCount !== null && (
        <div className="card bg-emerald-light border-emerald/30 p-5">
          <p className="text-emerald font-mono">{submittedCount} entries recorded.</p>
        </div>
      )}

      {results && submittedCount === null && (
        <div className="card bg-ruby-light border-ruby/30 p-5">
          <p className="text-ruby">Fix the flagged rows above and check again — nothing was saved yet.</p>
        </div>
      )}
    </div>
  );
}
