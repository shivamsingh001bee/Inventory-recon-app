import Navbar from "@/components/Navbar";
import ReportsClient from "./ReportsClient";

export default function ReportsPage() {
  return (
    <main>
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-slate" />
          <span className="text-slate text-sm font-medium">Monthly reconciliation against the master</span>
        </div>
        <h1 className="font-display font-semibold text-3xl text-ink mb-10">Reports</h1>
        <ReportsClient />
      </div>
    </main>
  );
}
