import Navbar from "@/components/Navbar";
import NoPktEntryForm from "./NoPktEntryForm";

export default function NoPktEntryPage() {
  return (
    <main>
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-amethyst" />
          <span className="text-amethyst-dark text-sm font-medium">For items with no known packet</span>
        </div>
        <h1 className="font-display font-semibold text-3xl text-ink mb-10">Entry where no Pkt No.</h1>
        <NoPktEntryForm />
      </div>
    </main>
  );
}
