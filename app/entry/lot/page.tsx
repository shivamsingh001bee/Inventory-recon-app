import Navbar from "@/components/Navbar";
import LotEntryForm from "./LotEntryForm";

export default function LotEntryPage() {
  return (
    <main>
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-topaz" />
          <span className="text-topaz-dark text-sm font-medium">Batch-level reconciliation</span>
        </div>
        <h1 className="font-display font-semibold text-3xl text-ink mb-10">Lot Entry</h1>
        <LotEntryForm />
      </div>
    </main>
  );
}
