"use client";

import { Fragment, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type ReconCase = "missing_from_master" | "missing_from_entries" | "out_of_stock_but_found";

const TABS: { id: ReconCase; label: string; dotClass: string; borderClass: string; hasPriceFilter: boolean }[] = [
  { id: "missing_from_master", label: "Missing from Master", dotClass: "bg-sapphire", borderClass: "border-sapphire", hasPriceFilter: false },
  { id: "missing_from_entries", label: "Missing from Entries", dotClass: "bg-topaz", borderClass: "border-topaz", hasPriceFilter: true },
  { id: "out_of_stock_but_found", label: "Out of Stock but Found", dotClass: "bg-ruby", borderClass: "border-ruby", hasPriceFilter: true }
];

interface MonthOption {
  recon_month: string;
  run_by: string;
  run_at: string;
}

function unwrap(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object" && val !== null && "value" in (val as any)) {
    return String((val as any).value);
  }
  return String(val);
}

function formatDate(val: unknown): string {
  const raw = unwrap(val);
  if (raw === "—") return raw;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ReportsClient() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const [months, setMonths] = useState<MonthOption[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [activeCase, setActiveCase] = useState<ReconCase>("missing_from_master");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/recon/months")
      .then((r) => r.json())
      .then((data) => {
        const raw: MonthOption[] = data.months ?? [];
        const list: MonthOption[] = raw.map((m) => ({
          recon_month: unwrap(m.recon_month),
          run_by: unwrap(m.run_by),
          run_at: unwrap(m.run_at)
        }));
        setMonths(list);
        if (list.length > 0) setSelectedMonth(list[0].recon_month);
      });
  }, []);

  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);
    const params = new URLSearchParams({ case: activeCase, month: selectedMonth });
    const tab = TABS.find((t) => t.id === activeCase)!;
    if (tab.hasPriceFilter) {
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
    }
    fetch(`/api/recon/report?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setRows(data.rows ?? []))
      .finally(() => setLoading(false));
  }, [selectedMonth, activeCase, minPrice, maxPrice]);

  async function handleRun() {
    setRunning(true);
    setRunMessage(null);
    try {
      const res = await fetch("/api/recon/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setRunMessage({ type: "error", text: data.error ?? "Something went wrong" });
      } else {
        setRunMessage({ type: "success", text: `Reconciliation complete for this month.` });
        const monthsRes = await fetch("/api/recon/months");
        const monthsData = await monthsRes.json();
        const normalized: MonthOption[] = (monthsData.months ?? []).map((m: MonthOption) => ({
          recon_month: unwrap(m.recon_month),
          run_by: unwrap(m.run_by),
          run_at: unwrap(m.run_at)
        }));
        setMonths(normalized);
        setSelectedMonth(data.reconMonth);
      }
    } finally {
      setRunning(false);
    }
  }

  const activeTab = TABS.find((t) => t.id === activeCase)!;

  return (
    <div>
      <div className="card p-5 mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-ink font-medium mb-1">Run this month's reconciliation</p>
          <p className="text-slate text-sm">
            {role === "admin"
              ? "As an admin, you can re-run this as many times as needed — each run replaces the saved data for the month."
              : "You can run this once per month. If it's already been run, ask an admin to re-run it."}
          </p>
        </div>
        <button onClick={handleRun} disabled={running} className="btn-primary whitespace-nowrap">
          {running ? "Running…" : "Run Now"}
        </button>
      </div>

      {runMessage && (
        <div className={`card p-4 mb-8 ${runMessage.type === "error" ? "bg-ruby-light border-ruby/30" : "bg-emerald-light border-emerald/30"}`}>
          <p className={runMessage.type === "error" ? "text-ruby text-sm" : "text-emerald text-sm"}>{runMessage.text}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveCase(tab.id);
                setExpanded(null);
              }}
              className={`px-4 py-2 rounded text-sm border transition-colors flex items-center gap-2 ${
                activeCase === tab.id ? `${tab.borderClass} text-ink font-medium` : "border-line text-slate hover:text-ink"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${tab.dotClass}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {months.length > 0 && (
          <select className="field-input w-auto" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            {months.map((m) => (
              <option key={m.recon_month} value={m.recon_month}>
                {formatDate(m.recon_month)}
              </option>
            ))}
          </select>
        )}
      </div>

      {activeTab.hasPriceFilter && (
        <div className="flex items-end gap-4 mb-6">
          <div>
            <p className="field-label">Min Price</p>
            <input
              type="number"
              step={1000}
              className="field-input w-36"
              placeholder="No min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </div>
          <div>
            <p className="field-label">Max Price</p>
            <input
              type="number"
              step={1000}
              className="field-input w-36"
              placeholder="No max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
          {(minPrice || maxPrice) && (
            <button
              onClick={() => {
                setMinPrice("");
                setMaxPrice("");
              }}
              className="text-slate hover:text-ink text-sm pb-2.5"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {months.length === 0 ? (
        <div className="card p-8 text-center text-slate">No reconciliation has been run yet — click Run Now to start.</div>
      ) : loading ? (
        <div className="card p-8 text-center text-slate">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center text-slate">No discrepancies found for this month.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left bg-paper">
                {activeCase === "missing_from_master" && (
                  <>
                    <th className="field-label px-5 py-3 mb-0">Entry No.</th>
                    <th className="field-label px-5 py-3 mb-0">Packet No.</th>
                    <th className="field-label px-5 py-3 mb-0">Gemstone</th>
                    <th className="field-label px-5 py-3 mb-0">Submitted By</th>
                    <th className="field-label px-5 py-3 mb-0">Submitted At</th>
                  </>
                )}
                {activeCase === "missing_from_entries" && (
                  <>
                    <th className="field-label px-5 py-3 mb-0">Inv. ID</th>
                    <th className="field-label px-5 py-3 mb-0">Status</th>
                    <th className="field-label px-5 py-3 mb-0">Location</th>
                    <th className="field-label px-5 py-3 mb-0">Gemstone</th>
                    <th className="field-label px-5 py-3 mb-0 text-right">Price</th>
                    <th className="field-label px-5 py-3 mb-0"></th>
                  </>
                )}
                {activeCase === "out_of_stock_but_found" && (
                  <>
                    <th className="field-label px-5 py-3 mb-0">Inv. ID</th>
                    <th className="field-label px-5 py-3 mb-0">Location</th>
                    <th className="field-label px-5 py-3 mb-0">Gemstone</th>
                    <th className="field-label px-5 py-3 mb-0 text-right">Price</th>
                    <th className="field-label px-5 py-3 mb-0">Found In Packet</th>
                    <th className="field-label px-5 py-3 mb-0">Found By</th>
                    <th className="field-label px-5 py-3 mb-0"></th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <Fragment key={i}>
                  <tr className="border-b border-line last:border-0 bg-ruby-light/40">
                    {activeCase === "missing_from_master" && (
                      <>
                        <td className="px-5 py-3 font-mono text-ink">{unwrap(row.entry_number)}</td>
                        <td className="px-5 py-3 text-ink">{unwrap(row.packet_no)}</td>
                        <td className="px-5 py-3 text-ink">{unwrap(row.gemstone)}</td>
                        <td className="px-5 py-3 text-slate">{unwrap(row.submitted_by)}</td>
                        <td className="px-5 py-3 text-slate">{formatDate(row.submitted_at)}</td>
                      </>
                    )}
                    {activeCase === "missing_from_entries" && (
                      <>
                        <td className="px-5 py-3 font-mono text-ink">{unwrap(row.inv_id)}</td>
                        <td className="px-5 py-3 text-ink">{unwrap(row.status)}</td>
                        <td className="px-5 py-3 text-ink">{unwrap(row.location)}</td>
                        <td className="px-5 py-3 text-ink">{unwrap(row.gemstone)}</td>
                        <td className="px-5 py-3 text-right font-mono text-ink">{unwrap(row.price)}</td>
                        <td className="px-5 py-3 text-right">
                          <button className="text-sapphire text-xs" onClick={() => setExpanded(expanded === i ? null : i)}>
                            {expanded === i ? "Hide" : "Details"}
                          </button>
                        </td>
                      </>
                    )}
                    {activeCase === "out_of_stock_but_found" && (
                      <>
                        <td className="px-5 py-3 font-mono text-ink">{unwrap(row.inv_id)}</td>
                        <td className="px-5 py-3 text-ink">{unwrap(row.location)}</td>
                        <td className="px-5 py-3 text-ink">{unwrap(row.gemstone)}</td>
                        <td className="px-5 py-3 text-right font-mono text-ink">{unwrap(row.price)}</td>
                        <td className="px-5 py-3 text-ink">{unwrap(row.found_packet_no)}</td>
                        <td className="px-5 py-3 text-slate">{unwrap(row.found_by)}</td>
                        <td className="px-5 py-3 text-right">
                          <button className="text-sapphire text-xs" onClick={() => setExpanded(expanded === i ? null : i)}>
                            {expanded === i ? "Hide" : "Details"}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                  {expanded === i && Boolean(row.full_row) && (
                    <tr className="bg-paper">
                      <td colSpan={7} className="px-5 py-4">
                        <pre className="text-xs text-slate whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                          {JSON.stringify(JSON.parse(String(row.full_row)), null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
