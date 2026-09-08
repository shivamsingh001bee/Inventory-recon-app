import Navbar from "@/components/Navbar";
import NormalEntryForm from "./NormalEntryForm";

export default function NormalEntryPage() {
  return (
    <main>
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-sapphire" />
          <span className="text-sapphire text-sm font-medium">Packet-level reconciliation</span>
        </div>
        <h1 className="font-display font-semibold text-3xl text-ink mb-10">Normal Entry</h1>
        <NormalEntryForm />
      </div>
    </main>
  );
}
