import Navbar from "@/components/Navbar";
import InvestigationsClient from "./InvestigationsClient";

export default function InvestigationsPage() {
  return (
    <main>
      <Navbar />
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <h1 className="font-display font-semibold text-3xl text-ink mb-10">Investigations</h1>
        <InvestigationsClient />
      </div>
    </main>
  );
}
