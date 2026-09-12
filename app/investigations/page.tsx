import Navbar from "@/components/Navbar";
import InvestigationsClient from "./InvestigationsClient";

export default function InvestigationsPage() {
  return (
    <main>
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-slate" />
          <span className="text-slate text-sm font-medium">Weekly cross-checks against company data</span>
        </div>
        <h1 className="font-display font-semibold text-3xl text-ink mb-10">Investigations</h1>
        <InvestigationsClient />
      </div>
    </main>
  );
}
