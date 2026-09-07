import Navbar from "@/components/Navbar";
import NoPktEntryForm from "./NoPktEntryForm";

export default function NoPktEntryPage() {
  return (
    <main>
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <p className="field-label mb-2">For items with no known packet</p>
        <h1 className="font-display italic text-3xl mb-10">Entry where no Pkt No.</h1>
        <NoPktEntryForm />
      </div>
    </main>
  );
}
