"use client";

import { useEffect, useState } from "react";

const today = new Date().toISOString().slice(0, 10);

export default function LotEntryForm() {
  const [gemstones, setGemstones] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const [location, setLocation] = useState("");
  const [gemstone, setGemstone] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [pcs, setPcs] = useState("");
  const [caratWt, setCaratWt] = useState("");
  const [entryDate, setEntryDate] = useState(today);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/criteria")
      .then((r) => r.json())
      .then((data) => {
        setGemstones(data.gemstones ?? []);
        setLocations(data.locations ?? []);
      });
  }, []);

  function resetForm() {
    setLotNo("");
    setPcs("");
    setCaratWt("");
    setEntryDate(today);
    setComments("");
  }

  async function handleSubmit() {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/entries/lot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lot_no: lotNo,
          no_of_pcs: Number(pcs),
          carat_wt: Number(caratWt),
          entry_date: entryDate,
          comments: comments || undefined,
          location,
          gemstone
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Something went wrong" });
      } else {
        setMessage({ type: "success", text: `Lot ${lotNo} recorded.` });
        resetForm();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = location && gemstone && lotNo && pcs && caratWt && entryDate;

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="field-label">Location</p>
          <select className="field-input" value={location} onChange={(e) => setLocation(e.target.value)}>
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
          <select className="field-input" value={gemstone} onChange={(e) => setGemstone(e.target.value)}>
            <option value="">Select…</option>
            {gemstones.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="field-label">Lot No.</p>
          <input className="field-input" value={lotNo} onChange={(e) => setLotNo(e.target.value)} />
        </div>
        <div>
          <p className="field-label">Date</p>
          <input
            type="date"
            className="field-input"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
          />
        </div>
        <div>
          <p className="field-label">No. of Pcs</p>
          <input type="number" className="field-input" value={pcs} onChange={(e) => setPcs(e.target.value)} />
        </div>
        <div>
          <p className="field-label">Carat Wt.</p>
          <input
            type="number"
            step="0.01"
            className="field-input"
            value={caratWt}
            onChange={(e) => setCaratWt(e.target.value)}
          />
        </div>
      </div>
      <div className="mb-8">
        <p className="field-label">Comments</p>
        <textarea className="field-input" rows={3} value={comments} onChange={(e) => setComments(e.target.value)} />
      </div>

      <button onClick={handleSubmit} disabled={!canSubmit || submitting} className="btn-primary">
        {submitting ? "Submitting…" : "Submit"}
      </button>

      {message && (
        <p className={`mt-5 text-sm font-mono ${message.type === "error" ? "text-rust" : "text-emerald-light"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
