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

export default function InvestigationsClient() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [weeks, setWeeks] = useState<WeekOption[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/investigations/list")
      .then((r) => r.json())
      .then((data) => {
        const list: Investigation[] = data.investigations ?? [];
        setInvestigations(list);
        if (list.length > 0) setSelectedId(list[0].id);
      });
  }, []);

  useEffect(() => {
    fetch("/api/investigations/weeks")
      .then((r) => r.json())
      .then((data) => {
        const raw: WeekOption[] = data.weeks ?? [];
        const list: WeekOption[] = raw.map((w) => ({
          recon_week: unwrap(w.recon_week),
          run_by: unwrap(w.run_by),
          run_at: unwrap(w.run_at)
        }));
        setWeeks(list);
        if (list.length > 0) setSelectedWeek(list[0].recon_week);
      });
  }, []);

  useEffect(() => {
    if (!selectedId || !selectedWeek) return;
    setLoading(true);
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
        const weeksRes = await fetch("/api/investigations/weeks");
        const weeksData = await weeksRes.json();
        const normalized: WeekOption[] = (weeksData.weeks ?? []).map((w: WeekOption) => ({
          recon_week: unwrap(w.recon_week),
          run_by: unwrap(w.run_by),
          run_at: unwrap(w.run_at)
        }));
        setWeeks(normalized);
        setSelectedWeek(data.reconWeek);
      }
    } finally {
      setRunning(false);
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
  const selectedInvestigation = investigations.find((i) => i.id === selectedId);

  return (
    <div>
      <div className="card p-5 mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-ink font-medium mb-1">Run this week's investigations</p>
          <p className="text-slate text-sm">
            {role === "admin"
              ? "As an admin, you can re-run this as many times as needed — each run replaces the saved data for the week."
              : "You can run this once per week. If it's already been run, ask an admin to re-run it."}
          </p>
        </div>
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
                      <button
                        key={inv.id}
                        onClick={() => setSelectedId(inv.id)}
                        className={`block w-full text-left text-sm px-2.5 py-1.5 rounded transition-colors ${
                          selectedId === inv.id ? "bg-sapphire/10 text-sapphire font-medium" : "text-slate hover:text-ink"
                        }`}
                      >
                        {inv.display_name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          <div className="flex-1 min-w-0">
            <h2 className="font-display font-semibold text-xl text-ink mb-4">
              {selectedInvestigation?.display_name ?? ""}
            </h2>

            {loading ? (
              <div className="card p-8 text-center text-slate">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="card p-8 text-center text-slate">No discrepancies found for this week.</div>
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left bg-paper">
                      {columns.map((col) => (
                        <th key={col} className="field-label px-4 py-3 mb-0 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
