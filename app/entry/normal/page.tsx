import Navbar from "@/components/Navbar";
import NormalEntryForm from "./NormalEntryForm";

export default function NormalEntryPage() {
  return (
    <main>
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <p className="field-label mb-2">Packet-level reconciliation</p>
        <h1 className="font-display italic text-3xl mb-10">Normal Entry</h1>
        <NormalEntryForm />
      </div>
    </main>
  );
}
