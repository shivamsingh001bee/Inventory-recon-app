"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Overview", dot: "bg-slate" },
  { href: "/entry/normal", label: "Normal Entry", dot: "bg-sapphire" },
  { href: "/entry/lot", label: "Lot Entry", dot: "bg-topaz" },
  { href: "/entry/no-pkt", label: "No Pkt No.", dot: "bg-amethyst" },
  { href: "/reports", label: "Reports", dot: "bg-ruby" },
  { href: "/investigations", label: "Investigations", dot: "bg-emerald" }
];

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as any)?.role;

  return (
    <header className="border-b border-line bg-surface">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="font-display font-semibold text-lg text-ink">Register</span>
          <nav className="flex items-center gap-6">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center gap-1.5 text-sm transition-colors ${
                    active ? "text-ink font-medium" : "text-slate hover:text-ink"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${active ? l.dot : "bg-line"}`} />
                  {l.label}
                </Link>
              );
            })}
            {role === "admin" && (
              <Link
                href="/dashboard/admin"
                className={`text-sm transition-colors ${
                  pathname?.startsWith("/dashboard/admin") ? "text-ink font-medium" : "text-slate hover:text-ink"
                }`}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate text-sm font-mono">{session?.user?.name}</span>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-slate hover:text-ink text-sm">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
