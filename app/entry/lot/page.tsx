import Navbar from "@/components/Navbar";
import LotEntryForm from "./LotEntryForm";

export default function LotEntryPage() {
  return (
    <main>
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <p className="field-label mb-2">Batch-level reconciliation</p>
        <h1 className="font-display italic text-3xl mb-10">Lot Entry</h1>
        <LotEntryForm />
      </div>
    </main>
  );
}
