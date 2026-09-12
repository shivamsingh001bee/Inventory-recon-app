"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

interface Investigation {
  id: string;
  display_name: string;
  group_number: string;
  admin_only: boolean;
  sort_order: number;
}

interface WeekOption {
  recon_week: string;
  run_by: string;
  run_at: string;
}

// Which columns each investigation can be filtered on. Deliberately a fixed
// map rather than "filter on any column" — investigation tables carry a lot
// of noise columns (run_id, full_row JSON blobs, etc.) that aren't useful
// filter targets, so this is an allowlist per investigation id.
const FILTERABLE_COLUMNS: Record<string, string[]> = {
  "1_1": ["missing_number"],
  "1_2": ["missing_number"],
  "2": ["missing_number"],
  "3": ["Invoice_ID"],
  "4_1": ["In_out_Order_Number", "Int_mas_Inventory_ID"],
  "4_2": ["In_out_Order_Number", "Int_mas_Inventory_ID"],
  "4_3": ["Order_ID"],
  "4_4": ["inv_id"],
  "5_1": ["Int_mas_Inventory_ID", "Order_ID", "Ex_Sku", "Invoice_ID"],
  "5_3": ["Int_mas_Inventory_ID"],
  "5_4": ["entry_number"],
  "5_5": ["Lot_ID"],
  "6_1": ["Sold_Inv_ID", "Sold_GP_ID"],
  "6_2": ["Sold_Gemstone2", "BOM_Gemstone2", "BOM_Inv_ID"]
};

const PAGE_SIZE = 50;

function unwrap(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object" && val !== null && "value" in (val as any)) {
    return String((val as any).value);
  }
  return String(val);
}

function formatDate(val: unknown): string {
  const raw = unwrap(val);
  if (raw === "") return "";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function groupLabel(group: string): string {
  return group === "extra" ? "Admin" : `Group ${group}`;
}

/** Quotes a CSV field only when it needs it, escaping embedded quotes. */
function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadCsv(filename: string, columns: string[], rows: Record<string, unknown>[]) {
  const lines = [
    columns.map(csvField).join(","),
    ...rows.map((row) => columns.map((col) => csvField(unwrap(row[col]))).join(","))
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function InvestigationsClient() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "admin";

  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [weeks, setWeeks] = useState<WeekOption[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Per-investigation individual-run state, keyed by investigation id.
  const [rowRunning, setRowRunning] = useState<string | null>(null);

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/investigations/list")
      .then((r) => r.json())
      .then((data) => {
        const list: Investigation[] = data.investigations ?? [];
        setInvestigations(list);
        if (list.length > 0) setSelectedId(list[0].id);
      });
  }, []);

  function refreshWeeks() {
    return fetch("/api/investigations/weeks")
      .then((r) => r.json())
      .then((data) => {
        const raw: WeekOption[] = data.weeks ?? [];
        const list: WeekOption[] = raw.map((w) => ({
          recon_week: unwrap(w.recon_week),
          run_by: unwrap(w.run_by),
          run_at: unwrap(w.run_at)
        }));
        setWeeks(list);
        return list;
      });
  }

  useEffect(() => {
    refreshWeeks().then((list) => {
      if (list.length > 0) setSelectedWeek(list[0].recon_week);
    });
  }, []);

  useEffect(() => {
    if (!selectedId || !selectedWeek) return;
    setLoading(true);
    setFilters({});
    setPage(1);
    fetch(`/api/investigations/report?id=${selectedId}&week=${selectedWeek}`)
      .then((r) => r.json())
      .then((data) => setRows(data.rows ?? []))
      .finally(() => setLoading(false));
  }, [selectedId, selectedWeek]);

  async function handleRun() {
    setRunning(true);
    setRunMessage(null);
    try {
      const res = await fetch("/api/investigations/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setRunMessage({ type: "error", text: data.error ?? "Something went wrong" });
      } else {
        setRunMessage({ type: "success", text: "This week's investigations are up to date." });
        await refreshWeeks();
        setSelectedWeek(data.reconWeek);
      }
    } finally {
      setRunning(false);
    }
  }

  async function handleRunOne(id: string) {
    setRowRunning(id);
    setRunMessage(null);
    try {
      const res = await fetch("/api/investigations/run-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) {
        setRunMessage({ type: "error", text: data.error ?? "Something went wrong" });
      } else {
        setRunMessage({ type: "success", text: `${data.displayName} was re-run.` });
        await refreshWeeks();
        if (id === selectedId) {
          setSelectedWeek(data.reconWeek);
        }
      }
    } finally {
      setRowRunning(null);
    }
  }

  const groups = useMemo(() => {
    const byGroup = new Map<string, Investigation[]>();
    for (const inv of investigations) {
      if (!byGroup.has(inv.group_number)) byGroup.set(inv.group_number, []);
      byGroup.get(inv.group_number)!.push(inv);
    }
    return Array.from(byGroup.entries());
  }, [investigations]);

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const filterColumns = FILTERABLE_COLUMNS[selectedId] ?? [];
  const selectedInvestigation = investigations.find((i) => i.id === selectedId);

  const filteredRows = useMemo(() => {
    const activeFilters = Object.entries(filters).filter(([, v]) => v.trim() !== "");
    if (activeFilters.length === 0) return rows;
    return rows.filter((row) =>
      activeFilters.every(([col, val]) => unwrap(row[col]).toLowerCase().includes(val.toLowerCase()))
    );
  }, [rows, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleFilterChange(col: string, value: string) {
    setFilters((prev) => ({ ...prev, [col]: value }));
    setPage(1);
  }

  function handleExport() {
    if (columns.length === 0) return;
    const filename = `${selectedInvestigation?.display_name ?? selectedId}_${selectedWeek}.csv`.replace(/\s+/g, "_");
    downloadCsv(filename, columns, filteredRows);
  }

  return (
    <div>
      <div className="card p-5 mb-8 flex items-center justify-between flex-wrap gap-4">
        <p className="text-ink font-medium">Run this week's investigations</p>
        <button onClick={handleRun} disabled={running} className="btn-primary whitespace-nowrap">
          {running ? "Running…" : "Run Now"}
        </button>
      </div>

      {runMessage && (
        <div
          className={`card p-4 mb-8 ${
            runMessage.type === "error" ? "bg-ruby-light border-ruby/30" : "bg-emerald-light border-emerald/30"
          }`}
        >
          <p className={runMessage.type === "error" ? "text-ruby text-sm" : "text-emerald text-sm"}>{runMessage.text}</p>
        </div>
      )}

      {weeks.length === 0 ? (
        <div className="card p-8 text-center text-slate">No investigations have been run yet — click Run Now to start.</div>
      ) : (
        <div className="flex gap-8">
          <aside className="w-56 shrink-0">
            <p className="field-label mb-2">Week</p>
            <select
              className="field-input mb-6"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
            >
              {weeks.map((w) => (
                <option key={w.recon_week} value={w.recon_week}>
                  {formatDate(w.recon_week)}
                </option>
              ))}
            </select>

            <nav className="space-y-5">
              {groups.map(([group, list]) => (
                <div key={group}>
                  <p className="field-label mb-2">{groupLabel(group)}</p>
                  <div className="space-y-1">
                    {list.map((inv) => (
                      <div key={inv.id} className="flex items-center gap-1 group">
                        <button
                          onClick={() => setSelectedId(inv.id)}
                          className={`flex-1 text-left text-sm px-2.5 py-1.5 rounded transition-colors truncate ${
                            selectedId === inv.id ? "bg-sapphire/10 text-sapphire font-medium" : "text-slate hover:text-ink"
                          }`}
                        >
                          {inv.display_name}
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleRunOne(inv.id)}
                            disabled={rowRunning === inv.id}
                            title={`Run only ${inv.display_name}`}
                            className="shrink-0 text-[11px] px-1.5 py-1 rounded text-slate hover:text-sapphire hover:bg-sapphire/10 transition-colors disabled:opacity-40"
                          >
                            {rowRunning === inv.id ? "…" : "Run"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h2 className="font-display font-semibold text-xl text-ink">
                {selectedInvestigation?.display_name ?? ""}
              </h2>
              <div className="flex items-center gap-2">
                {isAdmin && selectedId && (
                  <button
                    onClick={() => handleRunOne(selectedId)}
                    disabled={rowRunning === selectedId}
                    className="btn-ghost whitespace-nowrap"
                  >
                    {rowRunning === selectedId ? "Running…" : "Run this investigation"}
                  </button>
                )}
                <button
                  onClick={handleExport}
                  disabled={filteredRows.length === 0}
                  className="btn-ghost whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {filterColumns.length > 0 && rows.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-4">
                {filterColumns.map((col) => (
                  <input
                    key={col}
                    type="text"
                    placeholder={`Filter ${col}`}
                    value={filters[col] ?? ""}
                    onChange={(e) => handleFilterChange(col, e.target.value)}
                    className="field-input w-52"
                  />
                ))}
              </div>
            )}

            {loading ? (
              <div className="card p-8 text-center text-slate">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="card p-8 text-center text-slate">No discrepancies found for this week.</div>
            ) : filteredRows.length === 0 ? (
              <div className="card p-8 text-center text-slate">No rows match the current filters.</div>
            ) : (
              <>
                <div className="card overflow-auto max-h-[65vh]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-paper z-10">
                      <tr className="border-b border-line text-left">
                        {columns.map((col) => (
                          <th key={col} className="field-label px-4 py-3 mb-0 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((row, i) => (
                        <tr key={i} className="border-b border-line last:border-0">
                          {columns.map((col) => {
                            const raw = unwrap(row[col]);
                            const isLong = raw.length > 60;
                            return (
                              <td
                                key={col}
                                className="px-4 py-3 text-ink font-mono text-xs max-w-xs truncate"
                                title={isLong ? raw : undefined}
                              >
                                {raw}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-4 text-sm text-slate">
                  <span>
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of{" "}
                    {filteredRows.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="btn-ghost px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <span className="px-1">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="btn-ghost px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
